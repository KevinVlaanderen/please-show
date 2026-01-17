import type Graph from 'graphology';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

export interface Point {
  x: number;
  y: number;
}

export interface PackageHull {
  package: string;
  points: Point[];
  center: Point;
  color: string;
  depth: number; // 0 for root, 1 for children, etc.
}

/**
 * Compute the cross product of vectors OA and OB where O is the origin
 * Returns positive if counter-clockwise, negative if clockwise, 0 if collinear
 */
function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Graham scan algorithm to compute convex hull
 * Returns points in counter-clockwise order
 */
export function grahamScan(points: Point[]): Point[] {
  if (points.length < 3) {
    // For 1-2 points, return as-is (caller should handle this case)
    return [...points];
  }

  // Find the point with lowest y (and leftmost if tied)
  let pivot = points[0];
  for (const p of points) {
    if (p.y < pivot.y || (p.y === pivot.y && p.x < pivot.x)) {
      pivot = p;
    }
  }

  // Sort points by polar angle with respect to pivot
  const sorted = points
    .filter((p) => p !== pivot)
    .sort((a, b) => {
      const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      if (angleA !== angleB) return angleA - angleB;
      // If same angle, closer point first
      const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
      const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
      return distA - distB;
    });

  // Build hull using stack
  const hull: Point[] = [pivot];

  for (const p of sorted) {
    // Remove points that make clockwise turn
    while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }

  return hull;
}

/**
 * Expand hull points outward from center by padding amount
 */
function expandHull(points: Point[], center: Point, padding: number): Point[] {
  return points.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x: p.x + padding, y: p.y };
    const scale = (dist + padding) / dist;
    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale,
    };
  });
}

/**
 * Ensure hull has volume by converting degenerate cases (1-2 points or collinear)
 * into a minimum bounding rectangle with perpendicular padding
 */
function ensureHullVolume(points: Point[], minPadding: number): Point[] {
  if (points.length >= 3) {
    return points; // Already has volume
  }

  if (points.length === 1) {
    // Single point -> square
    const p = points[0];
    return [
      { x: p.x - minPadding, y: p.y - minPadding },
      { x: p.x + minPadding, y: p.y - minPadding },
      { x: p.x + minPadding, y: p.y + minPadding },
      { x: p.x - minPadding, y: p.y + minPadding },
    ];
  }

  // 2 points (line) -> thin rectangle
  const [p1, p2] = points;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular unit vector
  const perpX = len > 0 ? (-dy / len) * minPadding : minPadding;
  const perpY = len > 0 ? (dx / len) * minPadding : 0;

  return [
    { x: p1.x + perpX, y: p1.y + perpY },
    { x: p2.x + perpX, y: p2.y + perpY },
    { x: p2.x - perpX, y: p2.y - perpY },
    { x: p1.x - perpX, y: p1.y - perpY },
  ];
}

/**
 * Get the depth of a package (number of "/" separators)
 */
function getPackageDepth(pkg: string): number {
  if (!pkg.includes('/')) return 0;
  return pkg.split('/').length - 1;
}

/**
 * Check if a package is a descendant of another
 */
function isDescendant(child: string, parent: string): boolean {
  return child.startsWith(parent + '/');
}

/**
 * Compute hierarchical convex hulls for all packages
 * Parent package hulls include all descendant nodes
 */
export function computePackageHulls(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  padding: number = 20
): Map<string, PackageHull> {
  // Step 1: Group nodes by their exact package
  const packageNodes = new Map<string, { points: Point[]; color: string }>();

  graph.forEachNode((_, attrs) => {
    if (attrs.hidden) return;

    const pkg = attrs.package;
    if (!packageNodes.has(pkg)) {
      packageNodes.set(pkg, { points: [], color: attrs.color });
    }
    packageNodes.get(pkg)!.points.push({ x: attrs.x, y: attrs.y });
  });

  // Get all unique packages
  const allPackages = Array.from(packageNodes.keys());

  // Step 2: For each package, collect points from itself AND all descendants
  const hulls = new Map<string, PackageHull>();

  for (const pkg of allPackages) {
    // Collect points from this package and all descendants
    const allPoints: Point[] = [];
    let color = packageNodes.get(pkg)?.color || '#6366f1';

    for (const [otherPkg, data] of packageNodes) {
      if (otherPkg === pkg || isDescendant(otherPkg, pkg)) {
        allPoints.push(...data.points);
        // Use the color from the package itself if available
        if (otherPkg === pkg) {
          color = data.color;
        }
      }
    }

    // Skip packages with no points
    if (allPoints.length < 1) continue;

    // Calculate center
    const center = {
      x: allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length,
      y: allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length,
    };

    // Compute hull
    let hullPoints = grahamScan(allPoints);

    // Ensure hull has volume (handles collinear points)
    hullPoints = ensureHullVolume(hullPoints, padding);

    // Expand hull by padding
    const expandedPoints = expandHull(hullPoints, center, padding);

    hulls.set(pkg, {
      package: pkg,
      points: expandedPoints,
      center,
      color,
      depth: getPackageDepth(pkg),
    });
  }

  return hulls;
}
