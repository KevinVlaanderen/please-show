import type { PlzTarget } from './plz';

// Node attributes for Graphology/Sigma
export interface GraphNodeAttributes {
  // Display
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  hidden: boolean;
  highlighted: boolean;
  selected: boolean;
  originalColor?: string;

  // Metadata
  package: string;
  targetName: string;
  subrepo?: string;
  binary: boolean;
  labels: string[];

  // Computed metrics
  inDegree: number;
  outDegree: number;

  // Original data
  rawData: PlzTarget;
}

// Edge attributes for Graphology/Sigma
export interface GraphEdgeAttributes {
  color: string;
  size: number;
  hidden: boolean;
  highlighted: boolean;
  curvature?: number;
  type?: 'line' | 'curved';
  originalColor?: string;
  weight?: number;
}

// Package cluster for grouped views
export interface PackageCluster {
  id: string;
  label: string;
  nodeCount: number;
  expanded: boolean;
  childNodes: string[];
  x: number;
  y: number;
  size: number;
}

// Rectangular bounds for treemap partitioning
export interface Bounds {
  x: number;      // Left edge
  y: number;      // Top edge
  width: number;
  height: number;
}

// Node in the package hierarchy tree
export interface PackageTreeNode {
  name: string;           // Segment name (e.g., "cli")
  fullPath: string;       // Full package path (e.g., "src/cli")
  children: Map<string, PackageTreeNode>;  // Child packages
  nodes: string[];        // Direct node IDs (not in sub-packages)
  descendantNodes: string[];  // All node IDs including descendants
  bounds?: Bounds;        // Assigned rectangular region
  weight: number;         // For treemap sizing
}
