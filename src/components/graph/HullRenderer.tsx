import { useEffect, useRef, useCallback } from 'react';
import { useSigma } from '@react-sigma/core';
import { useLayoutStore } from '../../stores/layoutStore';
import { computePackageHulls, type PackageHull } from '../../lib/graph/hulls';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

const HULL_OPACITY = 0.15;
const HULL_STROKE_OPACITY = 0.3;
const HULL_STROKE_WIDTH = 2;

/**
 * Convert hex color to rgba with given opacity
 */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Renders convex hulls around package clusters
 * Must be used inside SigmaContainer
 */
export function HullRenderer() {
  const sigma = useSigma<GraphNodeAttributes, GraphEdgeAttributes>();
  const showHulls = useLayoutStore((state) => state.showHulls);
  const hullVersion = useLayoutStore((state) => state.hullVersion);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hullsRef = useRef<Map<string, PackageHull>>(new Map());

  // Draw hulls on the canvas
  const drawHulls = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showHulls) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get dimensions for canvas sizing
    const { width, height } = sigma.getDimensions();

    // Update canvas size if needed
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Sort hulls by depth (parents first, children on top)
    const sortedHulls = Array.from(hullsRef.current.values()).sort(
      (a, b) => a.depth - b.depth
    );

    // Draw each hull
    for (const hull of sortedHulls) {
      if (hull.points.length < 2) continue;

      ctx.beginPath();

      // Convert first point to viewport coordinates
      const firstPoint = sigma.graphToViewport({
        x: hull.points[0].x,
        y: hull.points[0].y,
      });
      ctx.moveTo(firstPoint.x, firstPoint.y);

      // Draw lines to remaining points
      for (let i = 1; i < hull.points.length; i++) {
        const point = sigma.graphToViewport({
          x: hull.points[i].x,
          y: hull.points[i].y,
        });
        ctx.lineTo(point.x, point.y);
      }

      ctx.closePath();

      // Fill with semi-transparent color
      ctx.fillStyle = hexToRgba(hull.color, HULL_OPACITY);
      ctx.fill();

      // Stroke with slightly more opaque color
      ctx.strokeStyle = hexToRgba(hull.color, HULL_STROKE_OPACITY);
      ctx.lineWidth = HULL_STROKE_WIDTH;
      ctx.stroke();
    }
  }, [sigma, showHulls]);

  // Create canvas layer and compute hulls
  useEffect(() => {
    if (!showHulls) {
      // Remove canvas if hulls are disabled
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      return;
    }

    // Create canvas layer if it doesn't exist
    if (!canvasRef.current) {
      const container = sigma.getContainer();
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '0'; // Behind nodes

      // Insert at the beginning of the container
      container.insertBefore(canvas, container.firstChild);
      canvasRef.current = canvas;
    }

    // Compute hulls
    const graph = sigma.getGraph();
    hullsRef.current = computePackageHulls(graph, 30);

    // Initial draw
    drawHulls();
  }, [sigma, showHulls, hullVersion, drawHulls]);

  // Redraw on camera changes
  useEffect(() => {
    if (!showHulls) return;

    // Listen to sigma render events
    const handleUpdate = () => drawHulls();
    sigma.on('afterRender', handleUpdate);

    return () => {
      sigma.off('afterRender', handleUpdate);
    };
  }, [sigma, showHulls, drawHulls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
    };
  }, []);

  return null;
}
