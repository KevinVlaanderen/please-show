import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useLayoutStore } from '../stores/layoutStore';
import { applyLayout, type LayoutAlgorithm } from '../lib/graph/layout';

/**
 * Hook to apply layout to the graph based on layout settings
 * Re-applies layout when the graph changes or when triggerRelayout is called
 */
export function useApplyLayout() {
  const graph = useAppStore((state) => state.graph);
  const clusterByPackage = useLayoutStore((state) => state.clusterByPackage);
  const clusteringStrength = useLayoutStore((state) => state.clusteringStrength);
  const hierarchicalLayout = useLayoutStore((state) => state.hierarchicalLayout);
  const layoutVersion = useLayoutStore((state) => state.layoutVersion);
  const layoutQuality = useLayoutStore((state) => state.layoutQuality);
  const dissuadeHubs = useLayoutStore((state) => state.dissuadeHubs);

  // Track which graph we've applied layout to
  const graphRef = useRef(graph);
  const lastLayoutVersion = useRef(layoutVersion);

  useEffect(() => {
    if (!graph) {
      graphRef.current = null;
      return;
    }

    // Determine if we need to apply layout
    const isNewGraph = graph !== graphRef.current;
    const isRelayoutTriggered = layoutVersion !== lastLayoutVersion.current;

    if (!isNewGraph && !isRelayoutTriggered) {
      return;
    }

    graphRef.current = graph;
    lastLayoutVersion.current = layoutVersion;

    // Determine algorithm based on settings
    // Hierarchical takes precedence if both are enabled
    let algorithm: LayoutAlgorithm;
    if (clusterByPackage && hierarchicalLayout) {
      algorithm = 'hierarchical';
    } else if (clusterByPackage) {
      algorithm = 'clusteredForceAtlas2';
    } else {
      algorithm = 'forceAtlas2';
    }

    applyLayout(graph, algorithm, {
      clusteringStrength,
      quality: layoutQuality,
      dissuadeHubs,
    });
  }, [graph, clusterByPackage, clusteringStrength, hierarchicalLayout, layoutVersion, layoutQuality, dissuadeHubs]);
}
