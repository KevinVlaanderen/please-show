import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useLayoutStore } from '../stores/layoutStore';

/**
 * Hook to apply edge bundling by computing curvature values for edges.
 * Uses hierarchical bundling based on package membership:
 * - Edges within the same package: straight (no curvature)
 * - Edges between packages: curved to create visual "highways"
 */
export function useApplyEdgeBundling() {
  const graph = useAppStore((state) => state.graph);
  const edgeBundling = useLayoutStore((state) => state.edgeBundling);
  const layoutVersion = useLayoutStore((state) => state.layoutVersion);

  useEffect(() => {
    if (!graph) return;

    if (!edgeBundling) {
      // Disable bundling - set all edges to straight lines
      graph.forEachEdge((edgeId) => {
        graph.setEdgeAttribute(edgeId, 'type', 'line');
        graph.setEdgeAttribute(edgeId, 'curvature', 0);
      });
      return;
    }

    // Compute package centers for hierarchical bundling
    const packageCenters = new Map<string, { x: number; y: number; count: number }>();

    graph.forEachNode((_nodeId, attrs) => {
      const pkg = attrs.package;
      const center = packageCenters.get(pkg) || { x: 0, y: 0, count: 0 };
      center.x += attrs.x;
      center.y += attrs.y;
      center.count++;
      packageCenters.set(pkg, center);
    });

    // Finalize centers
    for (const [pkg, center] of packageCenters) {
      packageCenters.set(pkg, {
        x: center.x / center.count,
        y: center.y / center.count,
        count: center.count,
      });
    }

    // Track parallel edges between node pairs
    const edgePairs = new Map<string, string[]>();

    graph.forEachEdge((edgeId, _attrs, source, target) => {
      const key = [source, target].sort().join('|||');
      const edges = edgePairs.get(key) || [];
      edges.push(edgeId);
      edgePairs.set(key, edges);
    });

    // Compute curvature for each edge
    graph.forEachEdge((edgeId, _attrs, source, target) => {
      const sourceAttrs = graph.getNodeAttributes(source);
      const targetAttrs = graph.getNodeAttributes(target);
      const sourcePkg = sourceAttrs.package;
      const targetPkg = targetAttrs.package;

      // Same package - straight line or slight curve for parallel edges
      if (sourcePkg === targetPkg) {
        const key = [source, target].sort().join('|||');
        const parallelEdges = edgePairs.get(key) || [edgeId];

        if (parallelEdges.length > 1) {
          // Multiple edges between same nodes - curve them apart
          const index = parallelEdges.indexOf(edgeId);
          const curvature = (index - (parallelEdges.length - 1) / 2) * 0.3;
          graph.setEdgeAttribute(edgeId, 'type', 'curved');
          graph.setEdgeAttribute(edgeId, 'curvature', curvature);
        } else {
          graph.setEdgeAttribute(edgeId, 'type', 'line');
          graph.setEdgeAttribute(edgeId, 'curvature', 0);
        }
        return;
      }

      // Different packages - compute hierarchical curvature
      const sourceCenter = packageCenters.get(sourcePkg)!;
      const targetCenter = packageCenters.get(targetPkg)!;

      // Vector from source to target
      const dx = targetAttrs.x - sourceAttrs.x;
      const dy = targetAttrs.y - sourceAttrs.y;
      const edgeLength = Math.sqrt(dx * dx + dy * dy);

      // Vector from source package center to target package center
      const pkgDx = targetCenter.x - sourceCenter.x;
      const pkgDy = targetCenter.y - sourceCenter.y;

      // Compute cross product to determine which side the edge should curve
      // This ensures edges going the same general direction curve together
      const cross = dx * pkgDy - dy * pkgDx;

      // Compute a curvature based on:
      // 1. The cross product sign (determines curve direction)
      // 2. The edge length (longer edges need more curve)
      // 3. A base curvature factor
      const baseCurvature = 0.2;
      const lengthFactor = Math.min(1, edgeLength / 500);
      const curvature = Math.sign(cross) * baseCurvature * (0.5 + lengthFactor * 0.5);

      // Handle parallel edges between different packages
      const key = [source, target].sort().join('|||');
      const parallelEdges = edgePairs.get(key) || [edgeId];

      if (parallelEdges.length > 1) {
        const index = parallelEdges.indexOf(edgeId);
        const offset = (index - (parallelEdges.length - 1) / 2) * 0.15;
        graph.setEdgeAttribute(edgeId, 'curvature', curvature + offset);
      } else {
        graph.setEdgeAttribute(edgeId, 'curvature', curvature);
      }

      graph.setEdgeAttribute(edgeId, 'type', 'curved');
    });
  }, [graph, edgeBundling, layoutVersion]);
}
