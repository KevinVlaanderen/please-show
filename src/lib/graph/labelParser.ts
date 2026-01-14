import type { ParsedLabel } from '../../types/plz';

/**
 * Regex pattern for parsing Please Build labels
 *
 * Formats:
 * - //package:target           -> local target
 * - ///subrepo//package:target -> subrepo target
 * - //package:target#subtarget -> target with subtarget
 * - :target                    -> target in current package (relative)
 */
const LABEL_PATTERN = /^(\/\/\/([^/]+))?\/\/([^:]*):([^#]+)(#(.+))?$/;
const RELATIVE_LABEL_PATTERN = /^:([^#]+)(#(.+))?$/;

/**
 * Parse a Please Build label into its components
 */
export function parseLabel(label: string): ParsedLabel | null {
  // Try relative label first (e.g., ":target")
  const relativeMatch = label.match(RELATIVE_LABEL_PATTERN);
  if (relativeMatch) {
    return {
      package: '',
      target: relativeMatch[1],
      subtarget: relativeMatch[3],
      raw: label,
    };
  }

  // Try full label
  const match = label.match(LABEL_PATTERN);
  if (!match) {
    return null;
  }

  return {
    subrepo: match[2],
    package: match[3],
    target: match[4],
    subtarget: match[6],
    raw: label,
  };
}

/**
 * Build a canonical label from a package path and target name
 */
export function buildLabel(pkg: string, target: string, subtarget?: string): string {
  let label = `//${pkg}:${target}`;
  if (subtarget) {
    label += `#${subtarget}`;
  }
  return label;
}

/**
 * Get a short display name for a label
 * Shows just the target name, or package:target if ambiguous
 */
export function getShortLabel(label: string): string {
  const parsed = parseLabel(label);
  if (!parsed) return label;

  if (parsed.subtarget) {
    return `${parsed.target}#${parsed.subtarget}`;
  }
  return parsed.target;
}

/**
 * Check if a label is external (from a subrepo)
 */
export function isExternalLabel(label: string): boolean {
  return label.startsWith('///');
}

/**
 * Resolve a potentially relative label given the current package context
 */
export function resolveLabel(label: string, currentPackage: string): string {
  if (label.startsWith(':')) {
    return `//${currentPackage}${label}`;
  }
  return label;
}
