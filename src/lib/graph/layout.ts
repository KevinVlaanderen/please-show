import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import noverlap from 'graphology-layout-noverlap';
import { topologicalGenerations } from 'graphology-dag';
import dagre from '@dagrejs/dagre';
import type { GraphNodeAttributes, GraphEdgeAttributes, PackageTreeNode, Bounds } from '../../types/graph';
import type { ClusteringStrength, LayoutQuality, LayeredDirection, LayeredSpacing } from '../../stores/layoutStore';
import { buildPackageTree, computePackageAverageLayer } from './packageTree';
import { applyTreemapToPackageTree, padBounds } from './treemap';

export type LayoutAlgorithm = 'forceAtlas2' | 'clusteredForceAtlas2' | 'hierarchical' | 'layered' | 'radial' | 'circular' | 'random' | 'stress';

interface LayoutOptions {
  iterations?: number;
  clusteringStrength?: ClusteringStrength;
  quality?: LayoutQuality;
  dissuadeHubs?: boolean;
  hierarchical?: boolean;
  layeredDirection?: LayeredDirection;
  layeredSpacing?: LayeredSpacing;
  radialCenterNode?: string | null;
  applyNoverlap?: boolean;
  edgeOptimization?: boolean;
  edgeWeightInfluence?: number;
  neighborGravity?: number;
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
 * Compute adaptive edge weights based on node degrees
 * Low-degree nodes get higher edge weights to pull them closer to neighbors
 */
function computeAdaptiveEdgeWeights(
  graph: Graph
): void {
  graph.forEachEdge((edgeId, _, source, target) => {
    const sourceDegree = graph.degree(source);
    const targetDegree = graph.degree(target);

    // Harmonic mean of degrees
    const harmonicDegree = (2 * sourceDegree * targetDegree) / (sourceDegree + targetDegree);

    // Weight inversely proportional to degree (low-degree = high weight)
    // Range: 1-11 (degree 1 = weight 11, degree 10+ = weight ~2)
    const weight = 1 + (10 / Math.max(harmonicDegree, 1));

    graph.setEdgeAttribute(edgeId, 'weight', weight);
  });
}

/**
 * Refine node positions by pulling them toward their neighbor centroids
 * Favors low-degree nodes and decreases strength over iterations
 */
function refineNodePositions(
  graph: Graph,
  iterations = 15
): void {
  for (let iter = 0; iter < iterations; iter++) {
    // Strength decreases over iterations for convergence
    const convergenceFactor = 1 - iter / iterations;

    // Compute new positions for all nodes
    const updates = new Map<string, { x: number; y: number }>();

    graph.forEachNode((nodeId) => {
      const neighbors = graph.neighbors(nodeId);
      if (neighbors.length === 0) {
        return; // Skip isolated nodes
      }

      // Compute centroid of neighbors
      let centroidX = 0;
      let centroidY = 0;
      for (const neighbor of neighbors) {
        centroidX += graph.getNodeAttribute(neighbor, 'x');
        centroidY += graph.getNodeAttribute(neighbor, 'y');
      }
      centroidX /= neighbors.length;
      centroidY /= neighbors.length;

      // Current position
      const x = graph.getNodeAttribute(nodeId, 'x');
      const y = graph.getNodeAttribute(nodeId, 'y');

      // Strength based on degree (favor low-degree nodes)
      const degree = graph.degree(nodeId);
      const degreeStrength = 1 / Math.sqrt(Math.max(degree, 1));

      // Overall strength
      const strength = 0.3 * degreeStrength * convergenceFactor;

      // Move toward centroid
      const newX = x + (centroidX - x) * strength;
      const newY = y + (centroidY - y) * strength;

      updates.set(nodeId, { x: newX, y: newY });
    });

    // Apply updates
    for (const [nodeId, pos] of updates) {
      graph.setNodeAttribute(nodeId, 'x', pos.x);
      graph.setNodeAttribute(nodeId, 'y', pos.y);
    }
  }
}

/**
 * Apply neighbor gravity forces to pull nodes toward their neighbor centroids
 * Strength is proportional to user setting and inversely proportional to degree
 */
function applyNeighborGravityForces(
  graph: Graph,
  strength: number
): void {
  if (strength <= 0) return;

  // Compute new positions for all nodes
  const updates = new Map<string, { x: number; y: number }>();

  graph.forEachNode((nodeId) => {
    const neighbors = graph.neighbors(nodeId);
    if (neighbors.length === 0) {
      return; // Skip isolated nodes
    }

    // Compute centroid of neighbors
    let centroidX = 0;
    let centroidY = 0;
    for (const neighbor of neighbors) {
      centroidX += graph.getNodeAttribute(neighbor, 'x');
      centroidY += graph.getNodeAttribute(neighbor, 'y');
    }
    centroidX /= neighbors.length;
    centroidY /= neighbors.length;

    // Current position
    const x = graph.getNodeAttribute(nodeId, 'x');
    const y = graph.getNodeAttribute(nodeId, 'y');

    // Strength based on degree (favor low-degree nodes)
    const degree = graph.degree(nodeId);
    const degreeStrength = 1 / Math.sqrt(Math.max(degree, 1));

    // Overall strength
    const effectiveStrength = strength * degreeStrength * 0.5;

    // Move toward centroid
    const newX = x + (centroidX - x) * effectiveStrength;
    const newY = y + (centroidY - y) * effectiveStrength;

    updates.set(nodeId, { x: newX, y: newY });
  });

  // Apply updates
  for (const [nodeId, pos] of updates) {
    graph.setNodeAttribute(nodeId, 'x', pos.x);
    graph.setNodeAttribute(nodeId, 'y', pos.y);
  }
}

/**
 * Compute all-pairs shortest path distances using BFS
 * Returns a map from node ID to map of (target ID -> distance)
 */
function computeAllPairsDistances(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): Map<string, Map<string, number>> {
  const allDistances = new Map<string, Map<string, number>>();

  // BFS from each node
  graph.forEachNode((startNode) => {
    const distances = new Map<string, number>();
    const queue: string[] = [startNode];
    distances.set(startNode, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distances.get(current)!;

      // Traverse both directions (neighbors)
      graph.forEachNeighbor(current, (neighbor) => {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, currentDist + 1);
          queue.push(neighbor);
        }
      });
    }

    // Handle disconnected nodes (set distance to Infinity)
    graph.forEachNode((nodeId) => {
      if (!distances.has(nodeId)) {
        distances.set(nodeId, Infinity);
      }
    });

    allDistances.set(startNode, distances);
  });

  return allDistances;
}

/**
 * Apply stress majorization layout algorithm
 * Minimizes the difference between graph distances and euclidean distances
 * Good for clear structure visualization, but O(n²) - slow for large graphs
 */
function applyStressMajorizationLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  const { iterations = 100 } = options;

  if (graph.order === 0) return;

  // Compute all-pairs shortest path distances
  const graphDistances = computeAllPairsDistances(graph);

  // Initialize with random positions in 500x500 space
  graph.forEachNode((nodeId) => {
    graph.setNodeAttribute(nodeId, 'x', Math.random() * 500 - 250);
    graph.setNodeAttribute(nodeId, 'y', Math.random() * 500 - 250);
  });

  const nodes = graph.nodes();
  const scalingFactor = 50; // Distance unit in pixels

  // Stress majorization iterations
  for (let iter = 0; iter < iterations; iter++) {
    const newPositions = new Map<string, { x: number; y: number }>();

    // For each node, compute weighted average position
    for (const nodeId of nodes) {
      const nodeDistances = graphDistances.get(nodeId)!;

      let weightedSumX = 0;
      let weightedSumY = 0;
      let totalWeight = 0;

      for (const otherId of nodes) {
        if (nodeId === otherId) continue;

        const graphDist = nodeDistances.get(otherId)!;
        if (graphDist === Infinity) continue; // Skip disconnected nodes

        // Current euclidean distance
        const x1 = graph.getNodeAttribute(nodeId, 'x');
        const y1 = graph.getNodeAttribute(nodeId, 'y');
        const x2 = graph.getNodeAttribute(otherId, 'x');
        const y2 = graph.getNodeAttribute(otherId, 'y');
        const euclideanDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

        // Weight by 1 / (graphDistance^2) to emphasize nearby nodes
        const weight = 1 / (graphDist * graphDist + 0.01); // Add small constant to avoid division by zero

        // Target euclidean distance = graphDistance * scalingFactor
        const targetDist = graphDist * scalingFactor;

        // If nodes are too close, use current position
        if (euclideanDist < 1) {
          weightedSumX += weight * x2;
          weightedSumY += weight * y2;
        } else {
          // Move toward target distance
          const ratio = targetDist / euclideanDist;
          weightedSumX += weight * (x1 + (x2 - x1) * ratio);
          weightedSumY += weight * (y1 + (y2 - y1) * ratio);
        }

        totalWeight += weight;
      }

      if (totalWeight > 0) {
        newPositions.set(nodeId, {
          x: weightedSumX / totalWeight,
          y: weightedSumY / totalWeight,
        });
      } else {
        // No connected nodes, keep current position
        newPositions.set(nodeId, {
          x: graph.getNodeAttribute(nodeId, 'x'),
          y: graph.getNodeAttribute(nodeId, 'y'),
        });
      }
    }

    // Apply new positions
    for (const [nodeId, pos] of newPositions) {
      graph.setNodeAttribute(nodeId, 'x', pos.x);
      graph.setNodeAttribute(nodeId, 'y', pos.y);
    }
  }
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
    edgeOptimization = false,
    edgeWeightInfluence = 2,
    neighborGravity = 0,
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

  // Apply adaptive edge weights to meta-graph if optimization enabled
  if (edgeOptimization) {
    // Compute weights based on package node counts (similar to degree-based weighting)
    metaGraph.forEachEdge((edgeId, _, source, target) => {
      const sourceNodes = packageNodes.get(source)?.length || 1;
      const targetNodes = packageNodes.get(target)?.length || 1;
      const harmonicSize = (2 * sourceNodes * targetNodes) / (sourceNodes + targetNodes);
      const weight = 1 + (10 / Math.max(harmonicSize, 1));
      metaGraph.setEdgeAttribute(edgeId, 'weight', weight);
    });
  }

  // Run ForceAtlas2 on the meta-graph to position packages
  const metaIterations = Math.max(75, Math.round(iterations * 0.75));

  // If neighbor gravity is enabled, run in batches
  if (neighborGravity > 0) {
    const batchSize = 15;
    const batches = Math.ceil(metaIterations / batchSize);

    for (let i = 0; i < batches; i++) {
      const iters = Math.min(batchSize, metaIterations - i * batchSize);

      forceAtlas2.assign(metaGraph, {
        iterations: iters,
        settings: {
          gravity: 0.5,
          scalingRatio: 50,
          strongGravityMode: false,
          linLogMode: true,
          barnesHutOptimize: packages.length > 50,
          barnesHutTheta: preset.barnesHutTheta,
          adjustSizes: true,
          edgeWeightInfluence: edgeOptimization ? edgeWeightInfluence : 1,
          slowDown: 1,
          outboundAttractionDistribution: dissuadeHubs,
        },
      });

      // Apply neighbor gravity to meta-graph
      applyNeighborGravityForces(metaGraph, neighborGravity);
    }
  } else {
    // Run in single pass
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
        edgeWeightInfluence: edgeOptimization ? edgeWeightInfluence : 1,
        slowDown: 1,
        outboundAttractionDistribution: dissuadeHubs,
      },
    });
  }

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
      graph.forEachOutEdge(nodeId, (edgeId, __, _source, target) => {
        if (nodeSet.has(target) && !subgraph.hasEdge(nodeId, target)) {
          // Copy edge weight from main graph if it exists
          const weight = graph.getEdgeAttribute(edgeId, 'weight');
          if (weight !== undefined) {
            subgraph.addEdge(nodeId, target, { weight });
          } else {
            subgraph.addEdge(nodeId, target);
          }
        }
      });
    }

    // Run a light ForceAtlas2 on the subgraph
    if (subgraph.size > 0) {
      // Apply adaptive edge weights if optimization enabled
      if (edgeOptimization) {
        computeAdaptiveEdgeWeights(subgraph);
      }

      const subgraphIterations = Math.round(iterations * 0.6);

      // If neighbor gravity is enabled, run in batches
      if (neighborGravity > 0) {
        const batchSize = 15;
        const batches = Math.ceil(subgraphIterations / batchSize);

        for (let i = 0; i < batches; i++) {
          const iters = Math.min(batchSize, subgraphIterations - i * batchSize);

          forceAtlas2.assign(subgraph, {
            iterations: iters,
            settings: {
              gravity: 1,
              scalingRatio: 10,
              strongGravityMode: true,
              linLogMode: true,
              adjustSizes: true,
              slowDown: 2,
              edgeWeightInfluence: edgeOptimization ? edgeWeightInfluence : 1,
              outboundAttractionDistribution: dissuadeHubs,
            },
          });

          // Apply neighbor gravity after each batch
          applyNeighborGravityForces(subgraph, neighborGravity);
        }
      } else {
        // Has internal edges - use force-directed layout
        forceAtlas2.assign(subgraph, {
          iterations: subgraphIterations,
          settings: {
            gravity: 1,
            scalingRatio: 10,
            strongGravityMode: true,
            linLogMode: true,
            adjustSizes: true,
            slowDown: 2,
            edgeWeightInfluence: edgeOptimization ? edgeWeightInfluence : 1,
            outboundAttractionDistribution: dissuadeHubs,
          },
        });
      }

      // Apply refinement if optimization enabled
      if (edgeOptimization) {
        refineNodePositions(subgraph, 10); // Fewer iterations for subgraphs
      }
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
  const {
    quality = 'balanced',
    dissuadeHubs = true,
    edgeOptimization = false,
    edgeWeightInfluence = 2,
    neighborGravity = 0,
  } = options;
  const preset = qualityPresets[quality];
  const iterations = options.iterations ?? preset.iterations;

  // Apply adaptive edge weights if optimization enabled
  if (edgeOptimization) {
    computeAdaptiveEdgeWeights(graph);
  }

  // If neighbor gravity is enabled, run ForceAtlas2 in batches
  if (neighborGravity > 0) {
    const batchSize = 15;
    const batches = Math.ceil(iterations / batchSize);

    for (let i = 0; i < batches; i++) {
      const iters = Math.min(batchSize, iterations - i * batchSize);

      forceAtlas2.assign(graph, {
        iterations: iters,
        settings: {
          gravity: 1,
          scalingRatio: 10,
          strongGravityMode: false,
          barnesHutOptimize: graph.order > 500,
          barnesHutTheta: preset.barnesHutTheta,
          adjustSizes: true,
          linLogMode: true,
          outboundAttractionDistribution: dissuadeHubs,
          edgeWeightInfluence: edgeOptimization ? edgeWeightInfluence : 1,
          slowDown: 1,
        },
      });

      // Apply neighbor gravity after each batch
      applyNeighborGravityForces(graph, neighborGravity);
    }
  } else {
    // Run ForceAtlas2 in single pass
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
        edgeWeightInfluence: edgeOptimization ? edgeWeightInfluence : 1,
        slowDown: 1,
      },
    });
  }

  // Apply refinement if optimization enabled
  if (edgeOptimization) {
    refineNodePositions(graph);
  }
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
    edgeOptimization = false,
    edgeWeightInfluence = 2,
    neighborGravity = 0,
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
  positionNodesInPackages(graph, packageTree, nodeToLayer, iterations, preset.barnesHutTheta, dissuadeHubs, edgeOptimization, edgeWeightInfluence, neighborGravity);
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
  dissuadeHubs: boolean,
  edgeOptimization = false,
  edgeWeightInfluence = 2,
  neighborGravity = 0
): void {
  // Process packages depth-first (children first)
  processPackageNode(graph, packageTree, nodeToLayer, iterations, barnesHutTheta, dissuadeHubs, edgeOptimization, edgeWeightInfluence, neighborGravity);
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
  dissuadeHubs: boolean,
  edgeOptimization = false,
  edgeWeightInfluence = 2,
  neighborGravity = 0
): void {
  // First, recursively process children
  for (const child of packageNode.children.values()) {
    processPackageNode(graph, child, nodeToLayer, iterations, barnesHutTheta, dissuadeHubs, edgeOptimization, edgeWeightInfluence, neighborGravity);
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
    graph.forEachOutEdge(nodeId, (edgeId, __, _source, target) => {
      if (nodeSet.has(target) && !subgraph.hasEdge(nodeId, target)) {
        // Copy edge weight from main graph if it exists
        const weight = graph.getEdgeAttribute(edgeId, 'weight');
        if (weight !== undefined) {
          subgraph.addEdge(nodeId, target, { weight });
        } else {
          subgraph.addEdge(nodeId, target);
        }
      }
    });
  }

  // Apply adaptive edge weights if optimization enabled
  if (edgeOptimization) {
    computeAdaptiveEdgeWeights(subgraph);
  }

  // Run bounded ForceAtlas2
  runBoundedForceAtlas2(subgraph, directNodeBounds, Math.round(iterations * 0.5), barnesHutTheta, dissuadeHubs, edgeOptimization, edgeWeightInfluence, neighborGravity);

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
  dissuadeHubs: boolean,
  edgeOptimization = false,
  edgeWeightInfluence = 2,
  neighborGravity = 0
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
        edgeWeightInfluence: edgeOptimization ? edgeWeightInfluence : 1,
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
        edgeWeightInfluence: edgeOptimization ? edgeWeightInfluence : 1,
        outboundAttractionDistribution: dissuadeHubs,
      },
    });

    // Apply neighbor gravity if enabled
    if (neighborGravity > 0) {
      applyNeighborGravityForces(subgraph, neighborGravity);
    }

    // Apply soft boundary forces
    applyBoundaryForces(subgraph, bounds, 0.3);

    // Hard clamp as fallback
    clampNodesToBounds(subgraph, bounds);
  }

  // Apply refinement if optimization enabled
  if (edgeOptimization) {
    refineNodePositions(subgraph, 10);
    // Re-clamp after refinement
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

const layeredSpacingPresets = {
  compact: { nodesep: 75, ranksep: 100, margin: 50 },
  balanced: { nodesep: 150, ranksep: 200, margin: 80 },
  spacious: { nodesep: 250, ranksep: 350, margin: 120 },
};

/**
 * Apply layered (Sugiyama) layout using dagre
 * Minimizes edge crossings by arranging nodes in layers
 * Good for DAG-style dependency graphs
 */
export function applyLayeredLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  const { layeredDirection = 'LR', layeredSpacing = 'balanced' } = options;

  if (graph.order === 0) return;

  // Get spacing preset
  const preset = layeredSpacingPresets[layeredSpacing];

  // Apply dynamic scaling based on graph size
  const nodeCount = graph.order;
  const scaleFactor = Math.min(1.5, 1.0 + Math.log10(Math.max(nodeCount / 100, 1)) * 0.5);

  // Create a dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({
    rankdir: layeredDirection,
    nodesep: preset.nodesep * scaleFactor,
    ranksep: preset.ranksep * scaleFactor,
    marginx: preset.margin,
    marginy: preset.margin,
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
    case 'stress':
      applyStressMajorizationLayout(graph, {
        iterations: options.quality
          ? Math.round(qualityPresets[options.quality].iterations * 0.67)
          : options.iterations,
      });
      break;
  }

  // Apply noverlap post-processing if requested
  if (options.applyNoverlap) {
    applyNoverlapPostProcess(graph);
  }
}
