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
 * Find all paths between two nodes using DFS.
 * Only follows edges in the dependent → dependency direction.
 */
export function findAllPaths(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  source: string,
  target: string
): string[][] {
  const allPaths: string[][] = [];
  const currentPath: string[] = [];
  const visited = new Set<string>();

  function dfs(node: string) {
    currentPath.push(node);
    visited.add(node);

    if (node === target) {
      // Found a path, add a copy to results
      allPaths.push([...currentPath]);
    } else {
      // Explore neighbors (only out direction: dependent → dependency)
      const neighbors = graph.outNeighbors(node);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      }
    }

    // Backtrack
    currentPath.pop();
    visited.delete(node);
  }

  dfs(source);
  return allPaths;
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
