import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import noverlap from 'graphology-layout-noverlap';
import { topologicalGenerations } from 'graphology-dag';
import dagre from '@dagrejs/dagre';
import type { GraphNodeAttributes, GraphEdgeAttributes, PackageTreeNode, Bounds } from '../../types/graph';
import type { ClusteringStrength, LayoutQuality, LayeredDirection } from '../../stores/layoutStore';
import { buildPackageTree, computePackageAverageLayer } from './packageTree';
import { applyTreemapToPackageTree, padBounds } from './treemap';

export type LayoutAlgorithm = 'forceAtlas2' | 'clusteredForceAtlas2' | 'hierarchical' | 'layered' | 'radial' | 'circular' | 'random';

interface LayoutOptions {
  iterations?: number;
  clusteringStrength?: ClusteringStrength;
  quality?: LayoutQuality;
  dissuadeHubs?: boolean;
  hierarchical?: boolean;
  layeredDirection?: LayeredDirection;
  radialCenterNode?: string | null;
  applyNoverlap?: boolean;
}

const qualityPresets = {
  fast: { iterations: 75, barnesHutTheta: 0.6 },
  balanced: { iterations: 150, barnesHutTheta: 0.4 },
  quality: { iterations: 250, barnesHutTheta: 0.3 },
};

interface PackageInfo {
  nodes: string[];
  centerX: number;
  centerY: number;
  radius: number;
}

/**
 * Two-phase clustered layout:
 * 1. Create a meta-graph of packages and position them using ForceAtlas2
 * 2. Arrange nodes within each package, then translate to package position
 */
function applyClusteredForceAtlas2(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  const {
    clusteringStrength = 'weak',
    quality = 'balanced',
    dissuadeHubs = true,
  } = options;
  const preset = qualityPresets[quality];
  const iterations = options.iterations ?? preset.iterations;

  // Group nodes by package
  const packageNodes = new Map<string, string[]>();
  graph.forEachNode((nodeId, attrs) => {
    const nodes = packageNodes.get(attrs.package) || [];
    nodes.push(nodeId);
    packageNodes.set(attrs.package, nodes);
  });

  const packages = Array.from(packageNodes.keys());
  if (packages.length === 0) return;

  // ============================================
  // PHASE 1: Position packages using meta-graph
  // ============================================

  // Create meta-graph where each package is a node
  const metaGraph = new Graph({ type: 'undirected' });

  // Add package nodes, sized by number of nodes they contain
  for (const [pkg, nodes] of packageNodes) {
    metaGraph.addNode(pkg, {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      size: Math.sqrt(nodes.length) * 10,
    });
  }

  // Add edges between packages that have dependencies
  const packageEdges = new Map<string, number>();
  graph.forEachEdge((_, __, source, target) => {
    const sourcePkg = graph.getNodeAttribute(source, 'package');
    const targetPkg = graph.getNodeAttribute(target, 'package');
    if (sourcePkg !== targetPkg) {
      const key = [sourcePkg, targetPkg].sort().join('|||');
      packageEdges.set(key, (packageEdges.get(key) || 0) + 1);
    }
  });

  for (const [key, weight] of packageEdges) {
    const [pkg1, pkg2] = key.split('|||');
    if (!metaGraph.hasEdge(pkg1, pkg2)) {
      metaGraph.addEdge(pkg1, pkg2, { weight });
    }
  }

  // Run ForceAtlas2 on the meta-graph to position packages
  const metaIterations = Math.max(75, Math.round(iterations * 0.75));
  forceAtlas2.assign(metaGraph, {
    iterations: metaIterations,
    settings: {
      gravity: 0.5,
      scalingRatio: 50,
      strongGravityMode: false,
      linLogMode: true,
      barnesHutOptimize: packages.length > 50,
      barnesHutTheta: preset.barnesHutTheta,
      adjustSizes: true,
      edgeWeightInfluence: 1,
      slowDown: 1,
      outboundAttractionDistribution: dissuadeHubs,
    },
  });

  // Extract package positions and calculate appropriate radii
  const packageInfo = new Map<string, PackageInfo>();
  const baseRadius = clusteringStrength === 'strong' ? 80 : 120;

  for (const [pkg, nodes] of packageNodes) {
    const x = metaGraph.getNodeAttribute(pkg, 'x');
    const y = metaGraph.getNodeAttribute(pkg, 'y');
    // Radius based on number of nodes, but capped
    const radius = baseRadius * Math.sqrt(Math.max(1, nodes.length / 3));
    packageInfo.set(pkg, { nodes, centerX: x, centerY: y, radius });
  }

  // ============================================
  // PHASE 2: Arrange nodes within each package
  // ============================================

  for (const [, info] of packageInfo) {
    const { nodes, centerX, centerY, radius } = info;

    if (nodes.length === 1) {
      // Single node - place at center
      graph.setNodeAttribute(nodes[0], 'x', centerX);
      graph.setNodeAttribute(nodes[0], 'y', centerY);
      continue;
    }

    // Create a subgraph for this package's internal edges
    const subgraph = new Graph({ type: 'directed' });
    const nodeSet = new Set(nodes);

    for (const nodeId of nodes) {
      subgraph.addNode(nodeId, {
        x: Math.random() * radius * 2 - radius,
        y: Math.random() * radius * 2 - radius,
        size: graph.getNodeAttribute(nodeId, 'size') || 5,
      });
    }

    // Add only internal edges (within the package)
    for (const nodeId of nodes) {
      graph.forEachOutEdge(nodeId, (_, __, _source, target) => {
        if (nodeSet.has(target) && !subgraph.hasEdge(nodeId, target)) {
          subgraph.addEdge(nodeId, target);
        }
      });
    }

    // Run a light ForceAtlas2 on the subgraph
    if (subgraph.size > 0) {
      // Has internal edges - use force-directed layout
      forceAtlas2.assign(subgraph, {
        iterations: Math.round(iterations * 0.6),
        settings: {
          gravity: 1,
          scalingRatio: 10,
          strongGravityMode: true,
          linLogMode: true,
          adjustSizes: true,
          slowDown: 2,
          outboundAttractionDistribution: dissuadeHubs,
        },
      });
    } else {
      // No internal edges - arrange in a circle or grid
      if (nodes.length <= 8) {
        // Circle for small groups
        const angleStep = (2 * Math.PI) / nodes.length;
        nodes.forEach((nodeId, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = radius * 0.5;
          subgraph.setNodeAttribute(nodeId, 'x', Math.cos(angle) * r);
          subgraph.setNodeAttribute(nodeId, 'y', Math.sin(angle) * r);
        });
      } else {
        // Grid for larger groups
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const spacing = (radius * 1.5) / cols;
        nodes.forEach((nodeId, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const totalRows = Math.ceil(nodes.length / cols);
          subgraph.setNodeAttribute(
            nodeId,
            'x',
            (col - (cols - 1) / 2) * spacing
          );
          subgraph.setNodeAttribute(
            nodeId,
            'y',
            (row - (totalRows - 1) / 2) * spacing
          );
        });
      }
    }

    // Normalize positions to fit within the package radius
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    subgraph.forEachNode((nodeId) => {
      const x = subgraph.getNodeAttribute(nodeId, 'x');
      const y = subgraph.getNodeAttribute(nodeId, 'y');
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(radius / (rangeX / 2 + 20), radius / (rangeY / 2 + 20), 1);

    // Apply positions to main graph, centered on package position
    subgraph.forEachNode((nodeId) => {
      const localX = subgraph.getNodeAttribute(nodeId, 'x');
      const localY = subgraph.getNodeAttribute(nodeId, 'y');

      // Center and scale, then translate to package position
      const normalizedX = (localX - (minX + maxX) / 2) * scale;
      const normalizedY = (localY - (minY + maxY) / 2) * scale;

      graph.setNodeAttribute(nodeId, 'x', centerX + normalizedX);
      graph.setNodeAttribute(nodeId, 'y', centerY + normalizedY);
    });
  }
}

/**
 * Apply ForceAtlas2 layout to the graph
 * Good for general dependency graphs, reveals clusters
 */
export function applyForceAtlas2(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  const { quality = 'balanced', dissuadeHubs = true } = options;
  const preset = qualityPresets[quality];
  const iterations = options.iterations ?? preset.iterations;

  forceAtlas2.assign(graph, {
    iterations,
    settings: {
      gravity: 1,
      scalingRatio: 10,
      strongGravityMode: false,
      barnesHutOptimize: graph.order > 500,
      barnesHutTheta: preset.barnesHutTheta,
      adjustSizes: true,
      linLogMode: true,
      outboundAttractionDistribution: dissuadeHubs,
      edgeWeightInfluence: 1,
      slowDown: 1,
    },
  });
}

/**
 * Apply circular layout - nodes arranged in a circle
 * Good for seeing all nodes at once
 */
export function applyCircularLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): void {
  circular.assign(graph, {
    scale: Math.max(100, graph.order * 2),
  });
}

/**
 * Apply random layout - useful as starting point
 */
export function applyRandomLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  scale = 1000
): void {
  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, 'x', Math.random() * scale - scale / 2);
    graph.setNodeAttribute(node, 'y', Math.random() * scale - scale / 2);
  });
}

/**
 * Hierarchical layout with treemap-based space partitioning
 *
 * Algorithm phases:
 * 1. Build package hierarchy tree
 * 2. Compute DAG topology for ordering
 * 3. Apply treemap partitioning (top-down)
 * 4. Position nodes within package bounds (constrained ForceAtlas2)
 */
function applyHierarchicalLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  const {
    quality = 'balanced',
    dissuadeHubs = true,
  } = options;
  const preset = qualityPresets[quality];
  const iterations = options.iterations ?? preset.iterations;

  if (graph.order === 0) return;

  // Phase 0: Build package tree
  const packageTree = buildPackageTree(graph);

  // Phase 1: Compute DAG topology for ordering
  const nodeToLayer = computeTopologicalLayers(graph);

  // Create ordering function for sibling packages
  const siblingOrderFn = (children: PackageTreeNode[]): PackageTreeNode[] => {
    return [...children].sort((a, b) => {
      const layerA = computePackageAverageLayer(a, nodeToLayer);
      const layerB = computePackageAverageLayer(b, nodeToLayer);
      return layerA - layerB;
    });
  };

  // Phase 2-3: Apply treemap partitioning
  // Calculate canvas size based on number of nodes
  const canvasSize = Math.max(1000, Math.sqrt(graph.order) * 150);
  const rootBounds: Bounds = {
    x: -canvasSize / 2,
    y: -canvasSize / 2,
    width: canvasSize,
    height: canvasSize,
  };

  applyTreemapToPackageTree(
    packageTree,
    rootBounds,
    20,  // padding
    50,  // minSize
    siblingOrderFn
  );

  // Phase 4: Position nodes within their package bounds
  positionNodesInPackages(graph, packageTree, nodeToLayer, iterations, preset.barnesHutTheta, dissuadeHubs);
}

/**
 * Compute topological layers using graphology-dag
 * Falls back to empty map if the graph has cycles
 */
function computeTopologicalLayers(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): Map<string, number> {
  const nodeToLayer = new Map<string, number>();

  try {
    // topologicalGenerations returns array of arrays (generations)
    const generations = topologicalGenerations(graph);
    generations.forEach((generation, layerIndex) => {
      for (const nodeId of generation) {
        nodeToLayer.set(nodeId, layerIndex);
      }
    });
  } catch {
    // Graph has cycles, fall back to no ordering
    // Nodes will get layer 0, resulting in alphabetical ordering
  }

  return nodeToLayer;
}

/**
 * Position nodes within their package's assigned bounds
 * Uses bounded ForceAtlas2 for each package
 */
function positionNodesInPackages(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  packageTree: PackageTreeNode,
  nodeToLayer: Map<string, number>,
  iterations: number,
  barnesHutTheta: number,
  dissuadeHubs: boolean
): void {
  // Process packages depth-first (children first)
  processPackageNode(graph, packageTree, nodeToLayer, iterations, barnesHutTheta, dissuadeHubs);
}

/**
 * Process a single package node - position its direct nodes within bounds
 */
function processPackageNode(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  packageNode: PackageTreeNode,
  nodeToLayer: Map<string, number>,
  iterations: number,
  barnesHutTheta: number,
  dissuadeHubs: boolean
): void {
  // First, recursively process children
  for (const child of packageNode.children.values()) {
    processPackageNode(graph, child, nodeToLayer, iterations, barnesHutTheta, dissuadeHubs);
  }

  // Then position this package's direct nodes
  const nodes = packageNode.nodes;
  if (nodes.length === 0 || !packageNode.bounds) {
    return;
  }

  const bounds = packageNode.bounds;

  // Calculate the bounds for direct nodes (excluding children's space)
  let directNodeBounds = bounds;
  if (packageNode.children.size > 0) {
    // Need to figure out where direct nodes go
    // In the treemap, we reserved space for direct nodes
    const directNodeWeight = nodes.length;
    const childrenWeight = Array.from(packageNode.children.values()).reduce(
      (sum, child) => sum + child.weight,
      0
    );
    const totalWeight = directNodeWeight + childrenWeight;

    if (totalWeight > 0 && directNodeWeight > 0) {
      const innerBounds = padBounds(bounds, 20);
      const directFraction = directNodeWeight / totalWeight;
      const isWide = innerBounds.width >= innerBounds.height;

      if (isWide) {
        // Direct nodes get the left portion
        directNodeBounds = {
          x: innerBounds.x,
          y: innerBounds.y,
          width: innerBounds.width * directFraction,
          height: innerBounds.height,
        };
      } else {
        // Direct nodes get the top portion
        directNodeBounds = {
          x: innerBounds.x,
          y: innerBounds.y,
          width: innerBounds.width,
          height: innerBounds.height * directFraction,
        };
      }
    }
  }

  if (nodes.length === 1) {
    // Single node - center it
    graph.setNodeAttribute(nodes[0], 'x', directNodeBounds.x + directNodeBounds.width / 2);
    graph.setNodeAttribute(nodes[0], 'y', directNodeBounds.y + directNodeBounds.height / 2);
    return;
  }

  // Create subgraph for bounded ForceAtlas2
  const subgraph = new Graph({ type: 'directed' });
  const nodeSet = new Set(nodes);

  // Initialize positions biased by topological layer
  const maxLayer = Math.max(...nodes.map(n => nodeToLayer.get(n) ?? 0), 1);

  for (const nodeId of nodes) {
    const layer = nodeToLayer.get(nodeId) ?? 0;
    // Bias initial x position by topological layer (left-to-right flow)
    const xBias = (layer / maxLayer) * directNodeBounds.width;
    subgraph.addNode(nodeId, {
      x: directNodeBounds.x + xBias + (Math.random() - 0.5) * (directNodeBounds.width * 0.3),
      y: directNodeBounds.y + Math.random() * directNodeBounds.height,
      size: graph.getNodeAttribute(nodeId, 'size') || 5,
    });
  }

  // Add only internal edges
  for (const nodeId of nodes) {
    graph.forEachOutEdge(nodeId, (_, __, _source, target) => {
      if (nodeSet.has(target) && !subgraph.hasEdge(nodeId, target)) {
        subgraph.addEdge(nodeId, target);
      }
    });
  }

  // Run bounded ForceAtlas2
  runBoundedForceAtlas2(subgraph, directNodeBounds, Math.round(iterations * 0.5), barnesHutTheta, dissuadeHubs);

  // Copy positions back to main graph
  for (const nodeId of nodes) {
    graph.setNodeAttribute(nodeId, 'x', subgraph.getNodeAttribute(nodeId, 'x'));
    graph.setNodeAttribute(nodeId, 'y', subgraph.getNodeAttribute(nodeId, 'y'));
  }
}

/**
 * Run ForceAtlas2 with boundary constraints
 * After each iteration batch, applies boundary forces and clamping
 */
function runBoundedForceAtlas2(
  subgraph: Graph,
  bounds: Bounds,
  totalIterations: number,
  barnesHutTheta: number,
  dissuadeHubs: boolean
): void {
  const nodeCount = subgraph.order;
  if (nodeCount === 0) return;

  // For small subgraphs, run FA2 normally then clamp
  if (nodeCount <= 3) {
    forceAtlas2.assign(subgraph, {
      iterations: totalIterations,
      settings: {
        gravity: 1,
        scalingRatio: 10,
        strongGravityMode: true,
        adjustSizes: true,
        linLogMode: true,
        outboundAttractionDistribution: dissuadeHubs,
      },
    });
    clampNodesToBounds(subgraph, bounds);
    return;
  }

  // Run FA2 in batches with boundary enforcement
  const batchSize = 25;
  const batches = Math.ceil(totalIterations / batchSize);

  for (let i = 0; i < batches; i++) {
    const iters = Math.min(batchSize, totalIterations - i * batchSize);

    forceAtlas2.assign(subgraph, {
      iterations: iters,
      settings: {
        gravity: 1,
        scalingRatio: 10,
        strongGravityMode: true,
        barnesHutOptimize: nodeCount > 50,
        barnesHutTheta,
        adjustSizes: true,
        linLogMode: true,
        outboundAttractionDistribution: dissuadeHubs,
      },
    });

    // Apply soft boundary forces
    applyBoundaryForces(subgraph, bounds, 0.3);

    // Hard clamp as fallback
    clampNodesToBounds(subgraph, bounds);
  }
}

/**
 * Apply soft forces pushing nodes away from boundaries
 */
function applyBoundaryForces(
  graph: Graph,
  bounds: Bounds,
  strength: number
): void {
  const margin = 20;
  const innerLeft = bounds.x + margin;
  const innerRight = bounds.x + bounds.width - margin;
  const innerTop = bounds.y + margin;
  const innerBottom = bounds.y + bounds.height - margin;

  graph.forEachNode((nodeId) => {
    let x = graph.getNodeAttribute(nodeId, 'x');
    let y = graph.getNodeAttribute(nodeId, 'y');

    // Push away from left edge
    if (x < innerLeft) {
      x += (innerLeft - x) * strength;
    }
    // Push away from right edge
    if (x > innerRight) {
      x -= (x - innerRight) * strength;
    }
    // Push away from top edge
    if (y < innerTop) {
      y += (innerTop - y) * strength;
    }
    // Push away from bottom edge
    if (y > innerBottom) {
      y -= (y - innerBottom) * strength;
    }

    graph.setNodeAttribute(nodeId, 'x', x);
    graph.setNodeAttribute(nodeId, 'y', y);
  });
}

/**
 * Hard clamp all nodes to stay within bounds
 */
function clampNodesToBounds(graph: Graph, bounds: Bounds): void {
  const margin = 10;
  const minX = bounds.x + margin;
  const maxX = bounds.x + bounds.width - margin;
  const minY = bounds.y + margin;
  const maxY = bounds.y + bounds.height - margin;

  graph.forEachNode((nodeId) => {
    let x = graph.getNodeAttribute(nodeId, 'x');
    let y = graph.getNodeAttribute(nodeId, 'y');

    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));

    graph.setNodeAttribute(nodeId, 'x', x);
    graph.setNodeAttribute(nodeId, 'y', y);
  });
}

/**
 * Apply layered (Sugiyama) layout using dagre
 * Minimizes edge crossings by arranging nodes in layers
 * Good for DAG-style dependency graphs
 */
export function applyLayeredLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  const { layeredDirection = 'LR' } = options;

  if (graph.order === 0) return;

  // Create a dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({
    rankdir: layeredDirection,
    nodesep: 50,
    ranksep: 100,
    marginx: 50,
    marginy: 50,
  });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre graph
  graph.forEachNode((nodeId, attrs) => {
    const size = attrs.size || 10;
    dagreGraph.setNode(nodeId, {
      width: size * 4,
      height: size * 4,
    });
  });

  // Add edges to dagre graph
  graph.forEachEdge((_, __, source, target) => {
    dagreGraph.setEdge(source, target);
  });

  // Run dagre layout
  dagre.layout(dagreGraph);

  // Apply positions back to graphology graph
  graph.forEachNode((nodeId) => {
    const dagreNode = dagreGraph.node(nodeId);
    if (dagreNode) {
      graph.setNodeAttribute(nodeId, 'x', dagreNode.x);
      graph.setNodeAttribute(nodeId, 'y', dagreNode.y);
    }
  });
}

/**
 * Apply radial layout - arranges nodes in concentric circles from a center node
 * Uses BFS to determine distance from center
 * Good for exploring dependencies from a specific target
 */
export function applyRadialLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  let { radialCenterNode } = options;

  if (graph.order === 0) return;

  // If no center node specified, find the node with highest degree
  if (!radialCenterNode || !graph.hasNode(radialCenterNode)) {
    let maxDegree = -1;
    graph.forEachNode((nodeId) => {
      const degree = graph.degree(nodeId);
      if (degree > maxDegree) {
        maxDegree = degree;
        radialCenterNode = nodeId;
      }
    });
  }

  if (!radialCenterNode) return;

  // BFS to compute distances from center
  const distances = new Map<string, number>();
  const queue: string[] = [radialCenterNode];
  distances.set(radialCenterNode, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;

    // Traverse both directions (dependencies and dependents)
    graph.forEachNeighbor(current, (neighbor) => {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    });
  }

  // Handle disconnected nodes
  graph.forEachNode((nodeId) => {
    if (!distances.has(nodeId)) {
      distances.set(nodeId, Infinity);
    }
  });

  // Group nodes by distance (layer)
  const layers = new Map<number, string[]>();
  let maxFiniteLayer = 0;

  distances.forEach((dist, nodeId) => {
    if (dist !== Infinity) {
      maxFiniteLayer = Math.max(maxFiniteLayer, dist);
    }
    const layerNodes = layers.get(dist) || [];
    layerNodes.push(nodeId);
    layers.set(dist, layerNodes);
  });

  // Place disconnected nodes in outer layer
  const disconnectedLayer = maxFiniteLayer + 1;
  const disconnectedNodes = layers.get(Infinity) || [];
  if (disconnectedNodes.length > 0) {
    layers.delete(Infinity);
    layers.set(disconnectedLayer, disconnectedNodes);
  }

  // Calculate radii for each layer
  const baseRadius = 100;
  const radiusIncrement = Math.max(80, graph.order * 2);

  // Position nodes in concentric circles
  layers.forEach((nodes, layer) => {
    if (layer === 0) {
      // Center node
      graph.setNodeAttribute(nodes[0], 'x', 0);
      graph.setNodeAttribute(nodes[0], 'y', 0);
    } else {
      const radius = baseRadius + (layer - 1) * radiusIncrement;
      const angleStep = (2 * Math.PI) / nodes.length;

      nodes.forEach((nodeId, index) => {
        const angle = index * angleStep - Math.PI / 2;
        graph.setNodeAttribute(nodeId, 'x', Math.cos(angle) * radius);
        graph.setNodeAttribute(nodeId, 'y', Math.sin(angle) * radius);
      });
    }
  });
}

/**
 * Apply noverlap post-processing to spread apart overlapping nodes
 * Can be applied after any layout algorithm
 */
export function applyNoverlapPostProcess(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): void {
  if (graph.order === 0) return;

  noverlap.assign(graph, {
    maxIterations: 150,
    settings: {
      margin: 5,
      ratio: 1.5,
      speed: 3,
    },
  });
}

/**
 * Apply a named layout algorithm
 */
export function applyLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  algorithm: LayoutAlgorithm,
  options: LayoutOptions = {}
): void {
  switch (algorithm) {
    case 'forceAtlas2':
      applyForceAtlas2(graph, options);
      break;
    case 'clusteredForceAtlas2':
      applyClusteredForceAtlas2(graph, options);
      break;
    case 'hierarchical':
      applyHierarchicalLayout(graph, options);
      break;
    case 'layered':
      applyLayeredLayout(graph, options);
      break;
    case 'radial':
      applyRadialLayout(graph, options);
      break;
    case 'circular':
      applyCircularLayout(graph);
      break;
    case 'random':
      applyRandomLayout(graph);
      break;
  }

  // Apply noverlap post-processing if requested
  if (options.applyNoverlap) {
    applyNoverlapPostProcess(graph);
  }
}
