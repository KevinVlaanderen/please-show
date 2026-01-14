import Graph from 'graphology';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

/**
 * Find all cycles in the graph using DFS
 * Returns an array of cycles, where each cycle is an array of node IDs
 */
export function findCycles(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const parent = new Map<string, string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    graph.forEachOutNeighbor(node, (neighbor) => {
      if (!visited.has(neighbor)) {
        parent.set(neighbor, node);
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle - extract it from the path
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // Complete the cycle
          cycles.push(cycle);
        }
      }
    });

    recursionStack.delete(node);
  }

  graph.forEachNode((nodeId) => {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  });

  return cycles;
}

/**
 * Check if the graph has any cycles
 */
export function hasCycles(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    let hasCycle = false;
    graph.forEachOutNeighbor(node, (neighbor) => {
      if (hasCycle) return;
      if (!visited.has(neighbor)) {
        hasCycle = dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        hasCycle = true;
      }
    });

    recursionStack.delete(node);
    return hasCycle;
  }

  let result = false;
  graph.forEachNode((nodeId) => {
    if (result) return;
    if (!visited.has(nodeId)) {
      result = dfs(nodeId);
    }
  });

  return result;
}
