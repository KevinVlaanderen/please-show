import type { Bounds, PackageTreeNode } from '../../types/graph';

/**
 * Squarified treemap algorithm based on "Squarified Treemaps" (Bruls et al.)
 * Partitions a rectangular area into sub-rectangles proportional to weights
 * while minimizing aspect ratios (keeping rectangles as square-like as possible)
 */

interface WeightedItem {
  item: PackageTreeNode;
  weight: number;
}

/**
 * Calculate the worst aspect ratio for a row of items in a given width
 */
function worstAspectRatio(row: WeightedItem[], width: number, totalArea: number): number {
  if (row.length === 0 || width === 0) return Infinity;

  const rowWeight = row.reduce((sum, r) => sum + r.weight, 0);
  const rowArea = (rowWeight / totalArea) * width * width; // Normalized

  let worst = 0;
  for (const item of row) {
    const itemArea = (item.weight / totalArea) * width * width;
    const itemHeight = rowArea / width;
    const itemWidth = itemArea / itemHeight;
    const ratio = Math.max(itemWidth / itemHeight, itemHeight / itemWidth);
    worst = Math.max(worst, ratio);
  }
  return worst;
}

/**
 * Squarified treemap layout for a list of weighted children within bounds
 */
export function squarifiedTreemap(
  children: PackageTreeNode[],
  bounds: Bounds,
  totalWeight: number
): Map<string, Bounds> {
  const result = new Map<string, Bounds>();

  if (children.length === 0 || totalWeight === 0) {
    return result;
  }

  // Handle single child - give it all the space
  if (children.length === 1) {
    result.set(children[0].fullPath, { ...bounds });
    return result;
  }

  // Create weighted items and sort by weight descending (important for squarified algorithm)
  const items: WeightedItem[] = children
    .map(child => ({ item: child, weight: child.weight }))
    .filter(wi => wi.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  if (items.length === 0) {
    return result;
  }

  // Layout using squarified algorithm
  layoutSquarified(items, bounds, totalWeight, result);

  return result;
}

/**
 * Main squarified layout algorithm
 */
function layoutSquarified(
  items: WeightedItem[],
  bounds: Bounds,
  totalWeight: number,
  result: Map<string, Bounds>
): void {
  if (items.length === 0) return;

  // Handle edge case - single item
  if (items.length === 1) {
    result.set(items[0].item.fullPath, { ...bounds });
    return;
  }

  // Handle edge case - very small bounds
  if (bounds.width < 1 || bounds.height < 1) {
    // Collapse all items into the bounds
    for (const item of items) {
      result.set(item.item.fullPath, { ...bounds });
    }
    return;
  }

  const isWide = bounds.width >= bounds.height;

  // Build rows greedily
  let currentBounds = { ...bounds };
  let remainingItems = [...items];
  let remainingWeight = totalWeight;

  while (remainingItems.length > 0) {
    const row: WeightedItem[] = [];
    const shortSide = isWide ? currentBounds.height : currentBounds.width;

    // Add items to row while it improves aspect ratio
    for (let i = 0; i < remainingItems.length; i++) {
      const candidate = [...row, remainingItems[i]];
      const currentWorst = worstAspectRatio(row, shortSide, remainingWeight);
      const candidateWorst = worstAspectRatio(candidate, shortSide, remainingWeight);

      if (row.length === 0 || candidateWorst <= currentWorst) {
        row.push(remainingItems[i]);
      } else {
        break;
      }
    }

    // If we couldn't add anything, force add at least one
    if (row.length === 0 && remainingItems.length > 0) {
      row.push(remainingItems[0]);
    }

    // Layout this row and update remaining bounds
    const rowWeight = row.reduce((sum, r) => sum + r.weight, 0);
    const rowFraction = rowWeight / remainingWeight;

    let rowBounds: Bounds;
    if (isWide) {
      // Row extends horizontally
      const rowWidth = currentBounds.width * rowFraction;
      rowBounds = {
        x: currentBounds.x,
        y: currentBounds.y,
        width: rowWidth,
        height: currentBounds.height,
      };
      currentBounds = {
        x: currentBounds.x + rowWidth,
        y: currentBounds.y,
        width: currentBounds.width - rowWidth,
        height: currentBounds.height,
      };
    } else {
      // Row extends vertically
      const rowHeight = currentBounds.height * rowFraction;
      rowBounds = {
        x: currentBounds.x,
        y: currentBounds.y,
        width: currentBounds.width,
        height: rowHeight,
      };
      currentBounds = {
        x: currentBounds.x,
        y: currentBounds.y + rowHeight,
        width: currentBounds.width,
        height: currentBounds.height - rowHeight,
      };
    }

    // Layout items within this row
    layoutRow(row, rowBounds, rowWeight, isWide, result);

    // Remove laid out items and update weight
    remainingItems = remainingItems.slice(row.length);
    remainingWeight -= rowWeight;
  }
}

/**
 * Layout items within a single row
 */
function layoutRow(
  row: WeightedItem[],
  bounds: Bounds,
  totalWeight: number,
  isWide: boolean,
  result: Map<string, Bounds>
): void {
  let offset = 0;

  for (const item of row) {
    const fraction = item.weight / totalWeight;

    let itemBounds: Bounds;
    if (isWide) {
      // Row is horizontal, items stack vertically within it
      const itemHeight = bounds.height * fraction;
      itemBounds = {
        x: bounds.x,
        y: bounds.y + offset,
        width: bounds.width,
        height: itemHeight,
      };
      offset += itemHeight;
    } else {
      // Row is vertical, items stack horizontally within it
      const itemWidth = bounds.width * fraction;
      itemBounds = {
        x: bounds.x + offset,
        y: bounds.y,
        width: itemWidth,
        height: bounds.height,
      };
      offset += itemWidth;
    }

    result.set(item.item.fullPath, itemBounds);
  }
}

/**
 * Apply padding to bounds (shrink inward)
 */
export function padBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x + padding,
    y: bounds.y + padding,
    width: Math.max(0, bounds.width - padding * 2),
    height: Math.max(0, bounds.height - padding * 2),
  };
}

/**
 * Recursively apply treemap layout to the package tree
 * Assigns bounds to each package in the tree
 */
export function applyTreemapToPackageTree(
  node: PackageTreeNode,
  bounds: Bounds,
  padding: number = 20,
  minSize: number = 50,
  siblingOrderFn?: (children: PackageTreeNode[]) => PackageTreeNode[]
): void {
  node.bounds = bounds;

  if (node.children.size === 0) {
    return;
  }

  // Calculate how much space to reserve for direct nodes vs children
  const directNodeWeight = node.nodes.length;
  const childrenWeight = Array.from(node.children.values()).reduce(
    (sum, child) => sum + child.weight,
    0
  );
  const totalWeight = directNodeWeight + childrenWeight;

  if (totalWeight === 0) {
    return;
  }

  // Apply padding to create inner bounds
  const innerBounds = padBounds(bounds, padding);
  if (innerBounds.width < minSize || innerBounds.height < minSize) {
    // Too small to subdivide, just assign bounds to all children
    for (const child of node.children.values()) {
      child.bounds = innerBounds;
    }
    return;
  }

  // Get children in order (optionally sorted by DAG layer)
  let children = Array.from(node.children.values());
  if (siblingOrderFn) {
    children = siblingOrderFn(children);
  }

  // If we have direct nodes, reserve space for them
  let childrenBounds = innerBounds;
  if (directNodeWeight > 0 && childrenWeight > 0) {
    // Reserve a portion for direct nodes
    const directFraction = directNodeWeight / totalWeight;
    const isWide = innerBounds.width >= innerBounds.height;

    if (isWide) {
      const directWidth = innerBounds.width * directFraction;
      // Direct nodes get the left portion, children get the right
      childrenBounds = {
        x: innerBounds.x + directWidth,
        y: innerBounds.y,
        width: innerBounds.width - directWidth,
        height: innerBounds.height,
      };
    } else {
      const directHeight = innerBounds.height * directFraction;
      // Direct nodes get the top portion, children get the bottom
      childrenBounds = {
        x: innerBounds.x,
        y: innerBounds.y + directHeight,
        width: innerBounds.width,
        height: innerBounds.height - directHeight,
      };
    }
  }

  // Apply squarified treemap to children
  const childBounds = squarifiedTreemap(children, childrenBounds, childrenWeight);

  // Recursively apply to each child
  for (const child of children) {
    const bounds = childBounds.get(child.fullPath);
    if (bounds) {
      applyTreemapToPackageTree(child, bounds, padding, minSize, siblingOrderFn);
    }
  }
}
