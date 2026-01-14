import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useDisplayStore } from '../stores/displayStore';
import { getNodeColor, createColorMaps } from '../lib/graph/colors';

export function useApplyColorScheme() {
  const graph = useAppStore((state) => state.graph);
  const colorScheme = useDisplayStore((state) => state.colorScheme);
  const colorMapsRef = useRef(createColorMaps());

  useEffect(() => {
    if (!graph) return;

    const colorMaps = colorMapsRef.current;

    graph.forEachNode((nodeId, attrs) => {
      const color = getNodeColor(attrs, colorScheme, colorMaps);
      graph.setNodeAttribute(nodeId, 'color', color);
    });
  }, [graph, colorScheme]);
}
