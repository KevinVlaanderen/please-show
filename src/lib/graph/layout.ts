import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';
import type { ClusteringStrength } from '../../stores/layoutStore';

export type LayoutAlgorithm = 'forceAtlas2' | 'clusteredForceAtlas2' | 'circular' | 'random';

interface LayoutOptions {
  iterations?: number;
  clusteringStrength?: ClusteringStrength;
}

interface PackagePosition {
  centerX: number;
  centerY: number;
  radius: number;
}

/**
 * Calculate positions for packages based on hierarchy
 * Root packages are arranged in a circle, child packages are positioned near their parents
 */
function calculatePackagePositions(
  packages: string[],
  scale: number = 1000
): Map<string, PackagePosition> {
  const positions = new Map<string, PackagePosition>();

  // Build hierarchy: find root packages and map parents to children
  const rootPackages = packages.filter((p) => !p.includes('/'));
  const childMap = new Map<string, string[]>();

  packages.forEach((pkg) => {
    const parts = pkg.split('/');
    if (parts.length > 1) {
      const parent = parts.slice(0, -1).join('/');
      if (!childMap.has(parent)) childMap.set(parent, []);
      childMap.get(parent)!.push(pkg);
    }
  });

  // Position root packages in a circle
  const angleStep = (2 * Math.PI) / Math.max(rootPackages.length, 1);
  rootPackages.forEach((pkg, i) => {
    const angle = i * angleStep;
    positions.set(pkg, {
      centerX: Math.cos(angle) * scale * 0.4,
      centerY: Math.sin(angle) * scale * 0.4,
      radius: scale * 0.2,
    });
  });

  // Recursively position child packages near their parents
  function positionChildren(parent: string) {
    const children = childMap.get(parent) || [];
    const parentPos = positions.get(parent);
    if (!parentPos || children.length === 0) return;

    const childRadius = parentPos.radius * 0.5;
    const childAngleStep = (2 * Math.PI) / children.length;

    children.forEach((child, i) => {
      const angle = i * childAngleStep;
      const offset = parentPos.radius * 0.6;
      positions.set(child, {
        centerX: parentPos.centerX + Math.cos(angle) * offset,
        centerY: parentPos.centerY + Math.sin(angle) * offset,
        radius: childRadius,
      });
      positionChildren(child);
    });
  }

  rootPackages.forEach((pkg) => positionChildren(pkg));

  // Handle packages that weren't positioned (orphans with missing parent chain)
  packages.forEach((pkg) => {
    if (!positions.has(pkg)) {
      positions.set(pkg, {
        centerX: (Math.random() - 0.5) * scale,
        centerY: (Math.random() - 0.5) * scale,
        radius: scale * 0.1,
      });
    }
  });

  return positions;
}

/**
 * Pre-position nodes by package with jitter
 */
function prePositionByPackage(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  strength: ClusteringStrength = 'weak'
): void {
  const packages = new Set<string>();
  graph.forEachNode((_, attrs) => packages.add(attrs.package));

  const packagePositions = calculatePackagePositions(Array.from(packages));

  graph.forEachNode((nodeId, attrs) => {
    const pos = packagePositions.get(attrs.package);
    if (pos) {
      // Tighter jitter for strong clustering
      const jitterScale = strength === 'strong' ? 0.3 : 0.8;
      const jitterX = (Math.random() - 0.5) * pos.radius * jitterScale;
      const jitterY = (Math.random() - 0.5) * pos.radius * jitterScale;

      graph.setNodeAttribute(nodeId, 'x', pos.centerX + jitterX);
      graph.setNodeAttribute(nodeId, 'y', pos.centerY + jitterY);
    }
  });
}

/**
 * Apply ForceAtlas2 with package clustering
 * Pre-positions nodes by package, then runs ForceAtlas2 with settings that preserve grouping
 */
function applyClusteredForceAtlas2(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  const { iterations = 100, clusteringStrength = 'weak' } = options;

  // Step 1: Pre-position nodes by package
  prePositionByPackage(graph, clusteringStrength);

  // Step 2: Run ForceAtlas2 with adjusted settings
  const settings =
    clusteringStrength === 'strong'
      ? {
          gravity: 3,
          scalingRatio: 5,
          strongGravityMode: true,
          linLogMode: true,
          barnesHutOptimize: graph.order > 500,
          barnesHutTheta: 0.5,
          adjustSizes: true,
          edgeWeightInfluence: 1,
          slowDown: 2,
        }
      : {
          gravity: 2,
          scalingRatio: 8,
          strongGravityMode: false,
          linLogMode: false,
          barnesHutOptimize: graph.order > 500,
          barnesHutTheta: 0.5,
          adjustSizes: true,
          edgeWeightInfluence: 1,
          slowDown: 1,
        };

  forceAtlas2.assign(graph, {
    iterations: clusteringStrength === 'strong' ? Math.round(iterations * 0.5) : iterations,
    settings,
  });
}

/**
 * Apply ForceAtlas2 layout to the graph
 * Good for general dependency graphs, reveals clusters
 */
export function applyForceAtlas2(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): void {
  const { iterations = 100 } = options;

  forceAtlas2.assign(graph, {
    iterations,
    settings: {
      gravity: 1,
      scalingRatio: 10,
      strongGravityMode: false,
      barnesHutOptimize: graph.order > 500,
      barnesHutTheta: 0.5,
      adjustSizes: true,
      linLogMode: false,
      outboundAttractionDistribution: false,
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
