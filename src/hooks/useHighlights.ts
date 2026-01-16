import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useUIStore } from '../stores/uiStore';

const HIGHLIGHT_COLOR = '#dc2626'; // red for path highlighting
const SELECTION_COLOR = '#2563eb'; // blue for selected node and neighbors
const OUTBOUND_EDGE_COLOR = '#16a34a'; // green for edges going away from selected
const INBOUND_EDGE_COLOR = '#dc2626'; // red for edges coming into selected

/**
 * Apply path and selection highlighting directly to graph attributes
 */
export function useApplyHighlights() {
  const graph = useAppStore((state) => state.graph);
  const highlightedPath = useUIStore((state) => state.highlightedPath);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);

  useEffect(() => {
    if (!graph) return;

    const pathSet = new Set(highlightedPath);

    // Build sets of neighbors and edges by direction from selected node
    const neighborSet = new Set<string>();
    const outboundEdges = new Set<string>();
    const inboundEdges = new Set<string>();

    if (selectedNodeId && graph.hasNode(selectedNodeId)) {
      // Track all neighbors
      graph.forEachNeighbor(selectedNodeId, (neighbor) => {
        neighborSet.add(neighbor);
      });
      // Track outbound edges (selected -> dependency)
      graph.forEachOutEdge(selectedNodeId, (edge) => {
        outboundEdges.add(edge);
      });
      // Track inbound edges (dependent -> selected)
      graph.forEachInEdge(selectedNodeId, (edge) => {
        inboundEdges.add(edge);
      });
    }

    // Apply node highlights
    graph.forEachNode((nodeId, attrs) => {
      const isInPath = pathSet.has(nodeId);
      const isSelected = nodeId === selectedNodeId;
      const isNeighbor = neighborSet.has(nodeId);

      // Store original color if not already stored
      if ((isInPath || isSelected) && !attrs.originalColor) {
        graph.setNodeAttribute(nodeId, 'originalColor', attrs.color);
      }

      if (isInPath) {
        // Path highlighting takes precedence
        graph.setNodeAttribute(nodeId, 'color', HIGHLIGHT_COLOR);
        graph.setNodeAttribute(nodeId, 'highlighted', true);
      } else if (isSelected) {
        // Selected node gets selection color
        graph.setNodeAttribute(nodeId, 'color', SELECTION_COLOR);
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
      const isOutbound = outboundEdges.has(edgeId);
      const isInbound = inboundEdges.has(edgeId);
      const isSelected = isOutbound || isInbound;

      // Store original color if not already stored
      if (isSelected && !attrs.originalColor) {
        graph.setEdgeAttribute(edgeId, 'originalColor', attrs.color);
      }

      if (isOutbound) {
        // Edges going from selected node to dependencies (green)
        graph.setEdgeAttribute(edgeId, 'color', OUTBOUND_EDGE_COLOR);
        graph.setEdgeAttribute(edgeId, 'highlighted', true);
      } else if (isInbound) {
        // Edges coming from dependents to selected node (red)
        graph.setEdgeAttribute(edgeId, 'color', INBOUND_EDGE_COLOR);
        graph.setEdgeAttribute(edgeId, 'highlighted', true);
      } else if (attrs.originalColor) {
        // Restore original color
        graph.setEdgeAttribute(edgeId, 'color', attrs.originalColor);
        graph.setEdgeAttribute(edgeId, 'highlighted', false);
        graph.removeEdgeAttribute(edgeId, 'originalColor');
      }
    });
  }, [graph, highlightedPath, selectedNodeId]);
}
