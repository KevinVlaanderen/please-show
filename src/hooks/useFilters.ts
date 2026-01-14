import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useFilterStore } from '../stores/filterStore';

export function useApplyFilters() {
  const graph = useAppStore((state) => state.graph);
  const { selectedPackages, selectedLabels, showBinaryOnly } = useFilterStore();

  useEffect(() => {
    if (!graph) return;

    const hasPackageFilter = selectedPackages.length > 0;
    const hasLabelFilter = selectedLabels.length > 0;

    // Determine which nodes should be visible
    const visibleNodes = new Set<string>();

    graph.forEachNode((nodeId, attrs) => {
      let visible = true;

      // Package filter
      if (hasPackageFilter && !selectedPackages.includes(attrs.package)) {
        visible = false;
      }

      // Label filter (must have at least one matching label)
      if (visible && hasLabelFilter) {
        const hasMatch = attrs.labels.some((l) => selectedLabels.includes(l));
        if (!hasMatch) visible = false;
      }

      // Binary filter
      if (visible && showBinaryOnly && !attrs.binary) {
        visible = false;
      }

      graph.setNodeAttribute(nodeId, 'hidden', !visible);
      if (visible) visibleNodes.add(nodeId);
    });

    // Hide edges where either endpoint is hidden
    graph.forEachEdge((edgeId, _attrs, source, target) => {
      const hidden = !visibleNodes.has(source) || !visibleNodes.has(target);
      graph.setEdgeAttribute(edgeId, 'hidden', hidden);
    });
  }, [graph, selectedPackages, selectedLabels, showBinaryOnly]);
}
