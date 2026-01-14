import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useFilterStore } from '../stores/filterStore';

/**
 * Check if a package is excluded by any of the excluded packages.
 * Handles hierarchical matching: excluding "src" also excludes "src/cli", "src/build", etc.
 */
function isPackageExcluded(nodePackage: string, excludedPackages: string[]): boolean {
  return excludedPackages.some((excluded) => {
    if (nodePackage === excluded) return true;
    // Check if nodePackage is a child of excluded (e.g., "src/cli" is child of "src")
    if (nodePackage.startsWith(excluded + '/')) return true;
    return false;
  });
}

export function useApplyFilters() {
  const graph = useAppStore((state) => state.graph);
  const { excludedPackages, excludedLabels, showBinaryOnly } = useFilterStore();

  useEffect(() => {
    if (!graph) return;

    // Determine which nodes should be visible
    const visibleNodes = new Set<string>();

    graph.forEachNode((nodeId, attrs) => {
      let visible = true;

      // Package filter (exclusion-based, hierarchical)
      if (isPackageExcluded(attrs.package, excludedPackages)) {
        visible = false;
      }

      // Label filter (exclude if node has ANY of the excluded labels)
      if (visible && excludedLabels.length > 0) {
        const hasExcludedLabel = attrs.labels.some((l) => excludedLabels.includes(l));
        if (hasExcludedLabel) visible = false;
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
  }, [graph, excludedPackages, excludedLabels, showBinaryOnly]);
}
