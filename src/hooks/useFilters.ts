import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useFilterStore } from '../stores/filterStore';
import { useLayoutStore } from '../stores/layoutStore';

export function useApplyFilters() {
  const graph = useAppStore((state) => state.graph);
  const { disabledPackages, disabledLabels, showBinaryOnly, hideIsolatedNodes } = useFilterStore();
  const triggerRelayout = useLayoutStore((state) => state.triggerRelayout);

  useEffect(() => {
    if (!graph) return;

    // Create sets for faster lookup
    const disabledPackageSet = new Set(disabledPackages);
    const disabledLabelSet = new Set(disabledLabels);

    // Determine which nodes should be visible
    const visibleNodes = new Set<string>();

    graph.forEachNode((nodeId, attrs) => {
      let visible = true;

      // Package filter: hidden if package is in disabled set
      if (disabledPackageSet.has(attrs.package)) {
        visible = false;
      }

      // Label filter: hidden if node has ANY disabled label
      if (visible && disabledLabelSet.size > 0) {
        const hasDisabledLabel = attrs.labels.some((l) => disabledLabelSet.has(l));
        if (hasDisabledLabel) visible = false;
      }

      // Binary filter
      if (visible && showBinaryOnly && !attrs.binary) {
        visible = false;
      }

      // Isolated nodes filter
      if (visible && hideIsolatedNodes) {
        const isIsolated = attrs.inDegree === 0 && attrs.outDegree === 0;
        if (isIsolated) visible = false;
      }

      graph.setNodeAttribute(nodeId, 'hidden', !visible);
      if (visible) visibleNodes.add(nodeId);
    });

    // Hide edges where either endpoint is hidden
    graph.forEachEdge((edgeId, _attrs, source, target) => {
      const hidden = !visibleNodes.has(source) || !visibleNodes.has(target);
      graph.setEdgeAttribute(edgeId, 'hidden', hidden);
    });

    // Trigger layout recomputation so nodes fill available space
    triggerRelayout();
  }, [graph, disabledPackages, disabledLabels, showBinaryOnly, hideIsolatedNodes, triggerRelayout]);
}
