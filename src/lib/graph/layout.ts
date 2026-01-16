import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';
import type { ClusteringStrength, LayoutQuality } from '../../stores/layoutStore';

export type LayoutAlgorithm = 'forceAtlas2' | 'clusteredForceAtlas2' | 'circular' | 'random';

interface LayoutOptions {
  iterations?: number;
  clusteringStrength?: ClusteringStrength;
  quality?: LayoutQuality;
  dissuadeHubs?: boolean;
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
    case 'circular':
      applyCircularLayout(graph);
      break;
    case 'random':
      applyRandomLayout(graph);
      break;
  }
}
