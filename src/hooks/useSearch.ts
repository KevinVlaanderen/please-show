import { useMemo } from 'react';
import { useAppStore } from '../stores/appStore';

export interface SearchResult {
  id: string;
  label: string;
  package: string;
  matchType: 'target' | 'package' | 'label';
}

export function useSearch(query: string): SearchResult[] {
  const graph = useAppStore((state) => state.graph);

  return useMemo(() => {
    if (!graph || !query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];
    const seen = new Set<string>();

    graph.forEachNode((nodeId, attrs) => {
      if (seen.has(nodeId)) return;

      // Match target name
      if (attrs.targetName.toLowerCase().includes(lowerQuery)) {
        seen.add(nodeId);
        results.push({
          id: nodeId,
          label: attrs.targetName,
          package: attrs.package,
          matchType: 'target',
        });
        return;
      }

      // Match package path
      if (attrs.package.toLowerCase().includes(lowerQuery)) {
        seen.add(nodeId);
        results.push({
          id: nodeId,
          label: attrs.targetName,
          package: attrs.package,
          matchType: 'package',
        });
        return;
      }

      // Match labels
      if (attrs.labels.some((l) => l.toLowerCase().includes(lowerQuery))) {
        seen.add(nodeId);
        results.push({
          id: nodeId,
          label: attrs.targetName,
          package: attrs.package,
          matchType: 'label',
        });
      }
    });

    // Sort by relevance: exact matches first, then by name
    return results.sort((a, b) => {
      const aExact = a.label.toLowerCase() === lowerQuery;
      const bExact = b.label.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.label.localeCompare(b.label);
    }).slice(0, 50); // Limit results
  }, [graph, query]);
}
