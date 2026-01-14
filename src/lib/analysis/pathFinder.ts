import Graph from 'graphology';
import { bidirectional } from 'graphology-shortest-path';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

/**
 * Find the shortest path between two nodes
 */
export function findShortestPath(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  source: string,
  target: string
): string[] | null {
  try {
    const path = bidirectional(graph, source, target);
    return path;
  } catch {
    return null;
  }
}
