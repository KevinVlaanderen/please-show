import Graph from 'graphology';
import type { GraphNodeAttributes, GraphEdgeAttributes, PackageTreeNode } from '../../types/graph';

/**
 * Build a package hierarchy tree from graph nodes
 * Transforms flat package paths into a tree structure where each node
 * contains its direct graph nodes and references to child packages
 */
export function buildPackageTree(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): PackageTreeNode {
  // Root node represents the entire graph
  const root: PackageTreeNode = {
    name: '',
    fullPath: '',
    children: new Map(),
    nodes: [],
    descendantNodes: [],
    weight: 0,
  };

  // Group nodes by their package path
  const nodesByPackage = new Map<string, string[]>();
  graph.forEachNode((nodeId, attrs) => {
    const pkg = attrs.package || '';
    const nodes = nodesByPackage.get(pkg) || [];
    nodes.push(nodeId);
    nodesByPackage.set(pkg, nodes);
  });

  // Build tree structure
  for (const [packagePath, nodeIds] of nodesByPackage) {
    const segments = packagePath ? packagePath.split('/') : [];
    let current = root;

    // Navigate/create path to this package
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const fullPath = segments.slice(0, i + 1).join('/');

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          fullPath,
          children: new Map(),
          nodes: [],
          descendantNodes: [],
          weight: 0,
        });
      }
      current = current.children.get(segment)!;
    }

    // Add nodes to the leaf package
    current.nodes = nodeIds;
  }

  // Compute descendant nodes and weights (bottom-up)
  computeDescendantsAndWeights(root);

  return root;
}

/**
 * Recursively compute descendant nodes and weights for each package
 * Must be called after the tree structure is built
 */
function computeDescendantsAndWeights(node: PackageTreeNode): void {
  // First, recurse into children
  for (const child of node.children.values()) {
    computeDescendantsAndWeights(child);
  }

  // Gather all descendant nodes (own nodes + children's descendants)
  node.descendantNodes = [...node.nodes];
  for (const child of node.children.values()) {
    node.descendantNodes.push(...child.descendantNodes);
  }

  // Weight is based on node count, with a minimum for empty packages
  // to ensure they get some space for their children
  const ownWeight = node.nodes.length;
  let childrenWeight = 0;
  for (const child of node.children.values()) {
    childrenWeight += child.weight;
  }

  // Weight includes own nodes plus children's weight
  // Use a minimum weight to ensure packages with only sub-packages get space
  node.weight = Math.max(ownWeight + childrenWeight, node.children.size > 0 ? 1 : 0);
}

/**
 * Get all packages at a given depth from the tree
 */
export function getPackagesAtDepth(
  root: PackageTreeNode,
  depth: number
): PackageTreeNode[] {
  if (depth === 0) {
    return [root];
  }

  const result: PackageTreeNode[] = [];
  for (const child of root.children.values()) {
    if (depth === 1) {
      result.push(child);
    } else {
      result.push(...getPackagesAtDepth(child, depth - 1));
    }
  }
  return result;
}

/**
 * Flatten the package tree into a list of all packages
 */
export function flattenPackageTree(root: PackageTreeNode): PackageTreeNode[] {
  const result: PackageTreeNode[] = [root];
  for (const child of root.children.values()) {
    result.push(...flattenPackageTree(child));
  }
  return result;
}

/**
 * Get the maximum depth of the package tree
 */
export function getTreeDepth(node: PackageTreeNode): number {
  if (node.children.size === 0) {
    return 0;
  }
  let maxChildDepth = 0;
  for (const child of node.children.values()) {
    maxChildDepth = Math.max(maxChildDepth, getTreeDepth(child));
  }
  return maxChildDepth + 1;
}

/**
 * Compute average topological layer for a package based on its nodes
 * Used for DAG-aware ordering of sibling packages
 */
export function computePackageAverageLayer(
  packageNode: PackageTreeNode,
  nodeToLayer: Map<string, number>
): number {
  const allNodes = packageNode.descendantNodes;
  if (allNodes.length === 0) {
    return 0;
  }

  let sum = 0;
  let count = 0;
  for (const nodeId of allNodes) {
    const layer = nodeToLayer.get(nodeId);
    if (layer !== undefined) {
      sum += layer;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}
