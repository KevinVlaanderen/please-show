import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useUIStore } from '../stores/uiStore';

const HIGHLIGHT_COLOR = '#dc2626'; // red

/**
 * Apply path highlighting directly to graph node attributes
 */
export function useApplyHighlights() {
  const graph = useAppStore((state) => state.graph);
  const highlightedPath = useUIStore((state) => state.highlightedPath);

  useEffect(() => {
    if (!graph) return;

    const pathSet = new Set(highlightedPath);

    graph.forEachNode((nodeId, attrs) => {
      const isInPath = pathSet.has(nodeId);

      // Store original color if not already stored
      if (isInPath && !attrs.originalColor) {
        graph.setNodeAttribute(nodeId, 'originalColor', attrs.color);
      }

      if (isInPath) {
        graph.setNodeAttribute(nodeId, 'color', HIGHLIGHT_COLOR);
        graph.setNodeAttribute(nodeId, 'highlighted', true);
      } else if (attrs.originalColor) {
        // Restore original color
        graph.setNodeAttribute(nodeId, 'color', attrs.originalColor);
        graph.setNodeAttribute(nodeId, 'highlighted', false);
        graph.removeNodeAttribute(nodeId, 'originalColor');
      }
    });
  }, [graph, highlightedPath]);
}
