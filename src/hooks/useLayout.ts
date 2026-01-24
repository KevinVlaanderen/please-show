import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useLayoutStore } from '../stores/layoutStore';
import { applyLayout } from '../lib/graph/layout';

/**
 * Hook to apply layout to the graph based on layout settings
 * Re-applies layout when the graph changes or when any layout setting changes
 */
export function useApplyLayout() {
  const graph = useAppStore((state) => state.graph);
  const layoutAlgorithm = useLayoutStore((state) => state.layoutAlgorithm);
  const layeredDirection = useLayoutStore((state) => state.layeredDirection);
  const layeredSpacing = useLayoutStore((state) => state.layeredSpacing);
  const radialCenterNode = useLayoutStore((state) => state.radialCenterNode);
  const applyNoverlap = useLayoutStore((state) => state.applyNoverlap);
  const clusteringStrength = useLayoutStore((state) => state.clusteringStrength);
  const layoutVersion = useLayoutStore((state) => state.layoutVersion);
  const layoutQuality = useLayoutStore((state) => state.layoutQuality);
  const dissuadeHubs = useLayoutStore((state) => state.dissuadeHubs);
  const edgeOptimization = useLayoutStore((state) => state.edgeOptimization);
  const edgeWeightInfluence = useLayoutStore((state) => state.edgeWeightInfluence);
  const neighborGravity = useLayoutStore((state) => state.neighborGravity);
  const incrementHullVersion = useLayoutStore((state) => state.incrementHullVersion);

  // Track whether we've done initial layout for the current graph
  const graphRef = useRef(graph);

  useEffect(() => {
    if (!graph) {
      graphRef.current = null;
      return;
    }

    graphRef.current = graph;

    applyLayout(graph, layoutAlgorithm, {
      clusteringStrength,
      quality: layoutQuality,
      dissuadeHubs,
      layeredDirection,
      layeredSpacing,
      radialCenterNode,
      applyNoverlap,
      edgeOptimization,
      edgeWeightInfluence,
      neighborGravity,
    });

    // Signal that layout is complete so hulls can be recomputed
    incrementHullVersion();
  }, [graph, layoutAlgorithm, layeredDirection, layeredSpacing, radialCenterNode, applyNoverlap, clusteringStrength, layoutVersion, layoutQuality, dissuadeHubs, edgeOptimization, edgeWeightInfluence, neighborGravity, incrementHullVersion]);
}
