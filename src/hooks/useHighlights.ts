import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useUIStore } from '../stores/uiStore';

const HIGHLIGHT_COLOR = '#dc2626'; // red for path highlighting
const PATH_EDGE_COLOR = '#16a34a'; // green for edges on the path
const OUTBOUND_EDGE_COLOR = '#16a34a'; // green for edges going away from selected
const INBOUND_EDGE_COLOR = '#dc2626'; // red for edges coming into selected

/**
 * Apply path and selection highlighting directly to graph attributes
 */
/**
 * Find all reachable nodes from a starting node using BFS
 */
function findReachableNodes(
  graph: any,
  startNode: string,
  direction: 'out' | 'in'
): { nodes: Set<string>; edges: Set<string> } {
  const visited = new Set<string>();
  const edges = new Set<string>();
  const queue: string[] = [startNode];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const edgeIterator = direction === 'out'
      ? (callback: (edge: string, attrs: any, source: string, target: string) => void) =>
          graph.forEachOutEdge(current, callback)
      : (callback: (edge: string, attrs: any, source: string, target: string) => void) =>
          graph.forEachInEdge(current, callback);

    edgeIterator((edge: string, _attrs: any, source: string, target: string) => {
      edges.add(edge);
      const neighbor = direction === 'out' ? target : source;
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    });
  }

  // Remove the starting node from visited set
  visited.delete(startNode);

  return { nodes: visited, edges };
}

export function useApplyHighlights() {
  const graph = useAppStore((state) => state.graph);
  const highlightedPath = useUIStore((state) => state.highlightedPath);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const inspectionMode = useUIStore((state) => state.inspectionMode);
  const inspectionTransitive = useUIStore((state) => state.inspectionTransitive);

  useEffect(() => {
    if (!graph) return;

    const pathSet = new Set(highlightedPath);

    // Build set of edges that are part of the path
    const pathEdges = new Set<string>();
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      const source = highlightedPath[i];
      const target = highlightedPath[i + 1];

      // Check for edge in both directions since the path may go either way
      const outEdge = graph.edge(source, target);
      const inEdge = graph.edge(target, source);

      if (outEdge) pathEdges.add(outEdge);
      if (inEdge) pathEdges.add(inEdge);
    }

    // Build sets of neighbors and edges by direction from selected node
    const neighborSet = new Set<string>();
    const outboundEdges = new Set<string>();
    const inboundEdges = new Set<string>();

    if (selectedNodeId && graph.hasNode(selectedNodeId)) {
      if (inspectionTransitive) {
        // Transitive: find all reachable nodes
        if (inspectionMode === 'both' || inspectionMode === 'dependencies') {
          const { nodes, edges } = findReachableNodes(graph, selectedNodeId, 'out');
          nodes.forEach(n => neighborSet.add(n));
          edges.forEach(e => outboundEdges.add(e));
        }
        if (inspectionMode === 'both' || inspectionMode === 'dependents') {
          const { nodes, edges } = findReachableNodes(graph, selectedNodeId, 'in');
          nodes.forEach(n => neighborSet.add(n));
          edges.forEach(e => inboundEdges.add(e));
        }
      } else {
        // Direct: only immediate neighbors
        if (inspectionMode === 'both' || inspectionMode === 'dependencies') {
          graph.forEachOutEdge(selectedNodeId, (edge, _attrs, _source, target) => {
            outboundEdges.add(edge);
            neighborSet.add(target);
          });
        }
        if (inspectionMode === 'both' || inspectionMode === 'dependents') {
          graph.forEachInEdge(selectedNodeId, (edge, _attrs, source) => {
            inboundEdges.add(edge);
            neighborSet.add(source);
          });
        }
      }
    }

    // Apply node highlights
    graph.forEachNode((nodeId, attrs) => {
      const isInPath = pathSet.has(nodeId);
      const isSelected = nodeId === selectedNodeId;
      const isNeighbor = neighborSet.has(nodeId);

      // Store original color if not already stored (only for path highlighting)
      if (isInPath && !attrs.originalColor) {
        graph.setNodeAttribute(nodeId, 'originalColor', attrs.color);
      }

      // Set selected attribute
      graph.setNodeAttribute(nodeId, 'selected', isSelected);

      if (isInPath) {
        // Path highlighting takes precedence
        graph.setNodeAttribute(nodeId, 'color', HIGHLIGHT_COLOR);
        graph.setNodeAttribute(nodeId, 'highlighted', true);
      } else if (isSelected) {
        // Selected node keeps its original color but is highlighted
        graph.setNodeAttribute(nodeId, 'highlighted', true);
      } else if (isNeighbor) {
        // Neighbors are highlighted but keep their original color
        graph.setNodeAttribute(nodeId, 'highlighted', true);
      } else if (attrs.originalColor) {
        // Restore original color
        graph.setNodeAttribute(nodeId, 'color', attrs.originalColor);
        graph.setNodeAttribute(nodeId, 'highlighted', false);
        graph.removeNodeAttribute(nodeId, 'originalColor');
      } else if (attrs.highlighted) {
        // Clear highlight from previously highlighted neighbors
        graph.setNodeAttribute(nodeId, 'highlighted', false);
      }
    });

    // Apply edge highlights
    graph.forEachEdge((edgeId, attrs) => {
      const isPathEdge = pathEdges.has(edgeId);
      const isOutbound = outboundEdges.has(edgeId);
      const isInbound = inboundEdges.has(edgeId);
      const isHighlighted = isPathEdge || isOutbound || isInbound;

      // Store original color and size if not already stored
      if (isHighlighted && !attrs.originalColor) {
        graph.setEdgeAttribute(edgeId, 'originalColor', attrs.color);
        graph.setEdgeAttribute(edgeId, 'originalSize', attrs.size);
      }

      if (isPathEdge) {
        // Edges along the path (green, thicker)
        graph.setEdgeAttribute(edgeId, 'color', PATH_EDGE_COLOR);
        graph.setEdgeAttribute(edgeId, 'size', 2);
        graph.setEdgeAttribute(edgeId, 'highlighted', true);
      } else if (isOutbound) {
        // Edges going from selected node to dependencies (green, thicker)
        graph.setEdgeAttribute(edgeId, 'color', OUTBOUND_EDGE_COLOR);
        graph.setEdgeAttribute(edgeId, 'size', 2);
        graph.setEdgeAttribute(edgeId, 'highlighted', true);
      } else if (isInbound) {
        // Edges coming from dependents to selected node (red, thicker)
        graph.setEdgeAttribute(edgeId, 'color', INBOUND_EDGE_COLOR);
        graph.setEdgeAttribute(edgeId, 'size', 2);
        graph.setEdgeAttribute(edgeId, 'highlighted', true);
      } else if (attrs.originalColor) {
        // Restore original color and size
        graph.setEdgeAttribute(edgeId, 'color', attrs.originalColor);
        graph.setEdgeAttribute(edgeId, 'size', attrs.originalSize ?? 1);
        graph.setEdgeAttribute(edgeId, 'highlighted', false);
        graph.removeEdgeAttribute(edgeId, 'originalColor');
        graph.removeEdgeAttribute(edgeId, 'originalSize');
      }
    });
  }, [graph, highlightedPath, selectedNodeId, inspectionMode, inspectionTransitive]);
}
