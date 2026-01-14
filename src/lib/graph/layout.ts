import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

export type LayoutAlgorithm = 'forceAtlas2' | 'circular' | 'random';

interface LayoutOptions {
  iterations?: number;
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
    case 'circular':
      applyCircularLayout(graph);
      break;
    case 'random':
      applyRandomLayout(graph);
      break;
  }
}
