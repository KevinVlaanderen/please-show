// Types for Please Build query output

export interface PlzQueryOutput {
  packages: Record<string, PlzPackage>;
}

export interface PlzPackage {
  targets: Record<string, PlzTarget>;
}

export interface PlzTarget {
  inputs?: string[];
  outs?: string[];
  srcs?: Record<string, string[]> | string[];
  tools?: Record<string, string[]> | string[];
  deps?: string[];
  data?: string[];
  labels?: string[];
  requires?: string[];
  command?: string;
  hash?: string;
  binary?: boolean;
}

// Parsed Please label
export interface ParsedLabel {
  subrepo?: string;
  package: string;
  target: string;
  subtarget?: string;
  raw: string;
}
