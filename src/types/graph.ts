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
