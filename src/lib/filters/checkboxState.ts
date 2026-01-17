/**
 * Utilities for tri-state checkbox logic in hierarchical tree views.
 *
 * The model uses an explicit "disabled" set where only leaf items are tracked.
 * Parent/intermediate node states are computed from their descendants.
 */

export type CheckboxState = 'checked' | 'unchecked' | 'indeterminate';

/**
 * Get all leaf descendants of a node path.
 * If the nodePath itself is a leaf (exists in allItems), it's included.
 * If nodePath is an intermediate node, returns all leaves under it.
 *
 * @param nodePath - The path to get descendants for (e.g., "src" or "src/cli")
 * @param allItems - All leaf items in the tree
 * @param separator - Path separator (e.g., "/" for packages, ":" for labels)
 */
export function getDescendantLeaves(
  nodePath: string,
  allItems: string[],
  separator: string
): string[] {
  // Special case: empty string (root) matches all items
  if (nodePath === '') {
    return allItems;
  }

  const prefix = nodePath + separator;
  return allItems.filter(
    (item) => item === nodePath || item.startsWith(prefix)
  );
}

/**
 * Compute the checkbox state for a node based on its descendant leaves.
 *
 * - If all descendants are enabled (not in disabled set): 'checked'
 * - If all descendants are disabled: 'unchecked'
 * - If mixed: 'indeterminate'
 *
 * @param nodePath - The path to compute state for
 * @param disabledItems - Set of disabled leaf items
 * @param allItems - All leaf items in the tree
 * @param separator - Path separator
 */
export function computeCheckboxState(
  nodePath: string,
  disabledItems: string[],
  allItems: string[],
  separator: string
): CheckboxState {
  const leaves = getDescendantLeaves(nodePath, allItems, separator);

  if (leaves.length === 0) {
    // This is an intermediate node with no leaves - shouldn't happen in practice
    // but default to checked (visible)
    return 'checked';
  }

  const disabledCount = leaves.filter((l) => disabledItems.includes(l)).length;

  if (disabledCount === 0) return 'checked';
  if (disabledCount === leaves.length) return 'unchecked';
  return 'indeterminate';
}

/**
 * Get the target leaf items to toggle when a node is clicked.
 *
 * @param nodePath - The path being toggled
 * @param allItems - All leaf items in the tree
 * @param separator - Path separator
 */
export function getToggleTargets(
  nodePath: string,
  allItems: string[],
  separator: string
): string[] {
  const leaves = getDescendantLeaves(nodePath, allItems, separator);

  // If no leaves found (shouldn't happen), return the path itself
  // This handles the edge case where an intermediate node has no actual items
  return leaves.length > 0 ? leaves : [nodePath];
}

/**
 * Compute the new disabled items set after toggling a node.
 *
 * @param nodePath - The path being toggled
 * @param currentState - Current checkbox state of the node
 * @param disabledItems - Current set of disabled items
 * @param allItems - All leaf items in the tree
 * @param separator - Path separator
 * @returns New disabled items array
 */
export function handleToggle(
  nodePath: string,
  currentState: CheckboxState,
  disabledItems: string[],
  allItems: string[],
  separator: string
): string[] {
  const targets = getToggleTargets(nodePath, allItems, separator);

  if (currentState === 'checked' || currentState === 'indeterminate') {
    // Disable all targets
    return [...new Set([...disabledItems, ...targets])];
  } else {
    // Enable all targets (remove from disabled)
    const targetSet = new Set(targets);
    return disabledItems.filter((p) => !targetSet.has(p));
  }
}
