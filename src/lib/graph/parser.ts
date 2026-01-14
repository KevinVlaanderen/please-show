import Graph from 'graphology';
import type { PlzQueryOutput } from '../../types/plz';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';
import { buildLabel, parseLabel, resolveLabel } from './labelParser';

// Color palette for packages
const PACKAGE_COLORS = [
  '#4f46e5', // indigo
  '#0891b2', // cyan
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // violet
  '#db2777', // pink
  '#0284c7', // sky
  '#65a30d', // lime
  '#ea580c', // orange
];

/**
 * Parse Please Build JSON output into a Graphology graph
 */
export function parseGraph(data: PlzQueryOutput): Graph<GraphNodeAttributes, GraphEdgeAttributes> {
  const graph = new Graph<GraphNodeAttributes, GraphEdgeAttributes>({
    type: 'directed',
    allowSelfLoops: false,
  });

  // Collect all packages for color assignment
  const packages = Object.keys(data.packages);
  const packageColorMap = new Map<string, string>();
  packages.forEach((pkg, index) => {
    packageColorMap.set(pkg, PACKAGE_COLORS[index % PACKAGE_COLORS.length]);
  });

  // First pass: create all nodes
  for (const [pkgPath, pkg] of Object.entries(data.packages)) {
    for (const [targetName, target] of Object.entries(pkg.targets)) {
      const nodeId = buildLabel(pkgPath, targetName);
      const color = packageColorMap.get(pkgPath) || PACKAGE_COLORS[0];

      graph.addNode(nodeId, {
        label: targetName,
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        size: 5,
        color,
        hidden: false,
        highlighted: false,
        package: pkgPath,
        targetName,
        binary: target.binary || false,
        labels: target.labels || [],
        inDegree: 0,
        outDegree: 0,
        rawData: target,
      });
    }
  }

  // Second pass: create edges from deps
  for (const [pkgPath, pkg] of Object.entries(data.packages)) {
    for (const [targetName, target] of Object.entries(pkg.targets)) {
      const sourceId = buildLabel(pkgPath, targetName);

      if (target.deps) {
        for (const dep of target.deps) {
          // Resolve relative labels
          const resolvedDep = resolveLabel(dep, pkgPath);
          const parsed = parseLabel(resolvedDep);

          if (!parsed) continue;

          // Skip external dependencies (subrepos) for now
          if (parsed.subrepo) continue;

          const targetId = buildLabel(parsed.package, parsed.target);

          // Only create edge if target node exists
          if (graph.hasNode(targetId) && !graph.hasEdge(sourceId, targetId)) {
            graph.addEdge(sourceId, targetId, {
              color: '#94a3b8',
              size: 1,
              hidden: false,
              highlighted: false,
            });
          }
        }
      }
    }
  }

  // Compute degree metrics
  graph.forEachNode((nodeId) => {
    graph.setNodeAttribute(nodeId, 'inDegree', graph.inDegree(nodeId));
    graph.setNodeAttribute(nodeId, 'outDegree', graph.outDegree(nodeId));

    // Scale node size based on degree
    const totalDegree = graph.inDegree(nodeId) + graph.outDegree(nodeId);
    const size = Math.max(3, Math.min(15, 3 + totalDegree * 0.5));
    graph.setNodeAttribute(nodeId, 'size', size);
  });

  return graph;
}

/**
 * Get unique packages from a graph
 */
export function getPackages(graph: Graph<GraphNodeAttributes>): string[] {
  const packages = new Set<string>();
  graph.forEachNode((_, attrs) => {
    packages.add(attrs.package);
  });
  return Array.from(packages).sort();
}

/**
 * Get unique labels from a graph
 */
export function getLabels(graph: Graph<GraphNodeAttributes>): string[] {
  const labels = new Set<string>();
  graph.forEachNode((_, attrs) => {
    attrs.labels.forEach((label) => labels.add(label));
  });
  return Array.from(labels).sort();
}

/**
 * Get graph statistics
 */
export function getGraphStats(graph: Graph<GraphNodeAttributes>) {
  return {
    nodeCount: graph.order,
    edgeCount: graph.size,
    packages: getPackages(graph).length,
  };
}
