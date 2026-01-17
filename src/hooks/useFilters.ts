import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useFilterStore } from '../stores/filterStore';
import { useLayoutStore } from '../stores/layoutStore';

/**
 * Check if a package matches hierarchically against a list.
 * Handles hierarchical matching: "src" matches "src/cli", "src/build", etc.
 * Root (empty string) matches all items.
 */
function matchesHierarchy(item: string, list: string[], separator: string): boolean {
  return list.some((entry) => {
    if (item === entry) return true;
    // Root entry matches all items
    if (entry === '') return true;
    // Check if item is a child of entry (e.g., "src/cli" is child of "src")
    if (item.startsWith(entry + separator)) return true;
    return false;
  });
}

/**
 * Check if a package should be hidden based on exclusions and inclusions.
 * Inclusions override exclusions for that specific package and its children.
 */
function isPackageHidden(
  nodePackage: string,
  excludedPackages: string[],
  includedPackages: string[]
): boolean {
  const excluded = matchesHierarchy(nodePackage, excludedPackages, '/');
  if (!excluded) return false;

  // Check if explicitly included (overrides exclusion)
  const included = matchesHierarchy(nodePackage, includedPackages, '/');
  return !included;
}

/**
 * Check if a label should be hidden based on exclusions and inclusions.
 */
function isLabelHidden(
  label: string,
  excludedLabels: string[],
  includedLabels: string[]
): boolean {
  const excluded = matchesHierarchy(label, excludedLabels, ':');
  if (!excluded) return false;

  const included = matchesHierarchy(label, includedLabels, ':');
  return !included;
}

export function useApplyFilters() {
  const graph = useAppStore((state) => state.graph);
  const {
    excludedPackages,
    excludedLabels,
    includedPackages,
    includedLabels,
    showBinaryOnly,
  } = useFilterStore();
  const incrementHullVersion = useLayoutStore((state) => state.incrementHullVersion);

  useEffect(() => {
    if (!graph) return;

    // Determine which nodes should be visible
    const visibleNodes = new Set<string>();

    graph.forEachNode((nodeId, attrs) => {
      let visible = true;

      // Package filter (exclusion-based with inclusion overrides, hierarchical)
      if (isPackageHidden(attrs.package, excludedPackages, includedPackages)) {
        visible = false;
      }

      // Label filter (exclude if node has ANY hidden label, hierarchical)
      if (visible && excludedLabels.length > 0) {
        const hasHiddenLabel = attrs.labels.some((l) =>
          isLabelHidden(l, excludedLabels, includedLabels)
        );
        if (hasHiddenLabel) visible = false;
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

    // Signal that filters changed so hulls can be recomputed
    incrementHullVersion();
  }, [graph, excludedPackages, excludedLabels, includedPackages, includedLabels, showBinaryOnly, incrementHullVersion]);
}
