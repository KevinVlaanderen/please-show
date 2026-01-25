import Graph from 'graphology';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

/**
 * Find the shortest path between two nodes using BFS.
 * Only follows edges in the dependent → dependency direction.
 */
export function findShortestPath(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  source: string,
  target: string
): string[] | null {
  // Only follow edges in the out direction (dependent → dependency)
  return bfsPath(graph, source, target, 'out');
}

/**
 * BFS to find shortest path
 * direction: 'out' follows edges, 'in' goes against edges
 */
function bfsPath(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  source: string,
  target: string,
  direction: 'in' | 'out'
): string[] | null {
  if (source === target) return [source];

  const visited = new Set<string>([source]);
  const parent = new Map<string, string>();
  const queue = [source];

  while (queue.length > 0) {
    const current = queue.shift()!;

    const neighbors = direction === 'out'
      ? graph.outNeighbors(current)
      : graph.inNeighbors(current);

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;

      visited.add(neighbor);
      parent.set(neighbor, current);

      if (neighbor === target) {
        // Reconstruct path
        const path: string[] = [target];
        let node = target;
        while (parent.has(node)) {
          node = parent.get(node)!;
          path.unshift(node);
        }
        return path;
      }

      queue.push(neighbor);
    }
  }

  return null;
}
