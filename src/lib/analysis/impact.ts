import Graph from 'graphology';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

/**
 * Get all nodes that depend on the given node (reverse dependencies)
 * These are the nodes that would be affected if the target node changes.
 */
export function getReverseDependencies(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  nodeId: string
): string[] {
  const dependents = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Get nodes that have edges pointing TO current (i.e., nodes that depend on current)
    graph.forEachInNeighbor(current, (dependent) => {
      if (!dependents.has(dependent)) {
        dependents.add(dependent);
        queue.push(dependent);
      }
    });
  }

  return Array.from(dependents);
}

/**
 * Get all transitive dependencies of a node
 */
export function getTransitiveDependencies(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  nodeId: string
): string[] {
  const deps = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    graph.forEachOutNeighbor(current, (dependency) => {
      if (!deps.has(dependency)) {
        deps.add(dependency);
        queue.push(dependency);
      }
    });
  }

  return Array.from(deps);
}
