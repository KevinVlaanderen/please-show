import type { ColorScheme } from '../../stores/displayStore';
import type { GraphNodeAttributes } from '../../types/graph';

// Color palette
const PALETTE = [
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

const BINARY_COLOR = '#059669'; // emerald for binaries
const NON_BINARY_COLOR = '#6b7280'; // gray for non-binaries
const DEFAULT_COLOR = '#6366f1'; // indigo default

/**
 * Get a consistent color for a string key
 */
function getColorForKey(key: string, colorMap: Map<string, string>): string {
  if (!colorMap.has(key)) {
    colorMap.set(key, PALETTE[colorMap.size % PALETTE.length]);
  }
  return colorMap.get(key)!;
}

/**
 * Get the color for a node based on the current color scheme
 */
export function getNodeColor(
  attrs: GraphNodeAttributes,
  scheme: ColorScheme,
  colorMaps: {
    packageColors: Map<string, string>;
    labelColors: Map<string, string>;
  }
): string {
  switch (scheme) {
    case 'package':
      return getColorForKey(attrs.package, colorMaps.packageColors);

    case 'label':
      // Use the first label, or default color if no labels
      if (attrs.labels.length > 0) {
        return getColorForKey(attrs.labels[0], colorMaps.labelColors);
      }
      return DEFAULT_COLOR;

    case 'binary':
      return attrs.binary ? BINARY_COLOR : NON_BINARY_COLOR;

    default:
      return DEFAULT_COLOR;
  }
}

/**
 * Create fresh color maps
 */
export function createColorMaps() {
  return {
    packageColors: new Map<string, string>(),
    labelColors: new Map<string, string>(),
  };
}
