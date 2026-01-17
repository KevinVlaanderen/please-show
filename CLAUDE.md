# Please Show - Development Guide

## Project Overview
A web tool that visualizes Please Build rule graphs. Loads JSON from `plz query graph --output json` and renders an interactive graph visualization with filtering, search, path analysis, and cycle detection.

## Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **Graph Rendering**: Sigma.js v3 (WebGL) + Graphology
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4

## Project Structure
```
src/
├── components/
│   ├── data-source/     # FileUpload, UrlInput
│   ├── graph/           # GraphCanvas, GraphControls, HullRenderer
│   ├── header/          # ExamplesDropdown
│   ├── layout/          # Sidebar (tabbed: Filters, Display, Analysis)
│   ├── panels/          # SearchPanel, FilterPanel, DisplayOptionsPanel, AnalysisPanel, NodeDetailsPanel
│   └── ui/              # Reusable primitives (SearchInput)
├── hooks/
│   ├── useFilters.ts      # Applies exclusion-based filters, sets node/edge hidden
│   ├── useColorScheme.ts  # Applies color scheme to nodes
│   ├── useHighlights.ts   # Applies path/cycle/selection highlighting
│   ├── useLayout.ts       # Runs ForceAtlas2 with package clustering
│   ├── useEdgeBundling.ts # Applies edge curvature for bundling
│   └── useSearch.ts       # Search results computation
├── stores/
│   ├── appStore.ts      # Graph data, loading state, packages/labels metadata
│   ├── uiStore.ts       # Selection, highlights, search, panel state
│   ├── filterStore.ts   # Excluded/included packages/labels, binary filter
│   ├── displayStore.ts  # Color scheme setting (package|label|binary)
│   └── layoutStore.ts   # Clustering, hulls, layout quality, edge bundling
├── lib/
│   ├── graph/
│   │   ├── parser.ts      # JSON to Graphology conversion
│   │   ├── labelParser.ts # Please label syntax parsing
│   │   ├── layout.ts      # ForceAtlas2 layout with clustering
│   │   ├── colors.ts      # Color scheme utilities
│   │   └── hulls.ts       # Convex hull computation for package clusters
│   ├── analysis/
│   │   ├── pathFinder.ts    # BFS shortest path
│   │   └── cycleDetector.ts # DFS cycle detection
│   └── export/
│       └── png.ts       # PNG export capturing WebGL canvas
└── types/
    ├── plz.ts           # Please Build JSON types (PlzQueryOutput, PlzTarget)
    └── graph.ts         # Graphology node/edge attributes
```

## Commands
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Type check + production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Key Patterns

### Graph Modifications via Hooks
All graph attribute changes (colors, visibility, highlighting, positions) are done via hooks in `src/hooks/`. These run in App.tsx and directly modify the Graphology graph instance.

**Important**: Don't use Sigma's `nodeReducer`/`edgeReducer` for dynamic updates - they capture stale closures. Instead, modify graph attributes directly:
```typescript
graph.setNodeAttribute(nodeId, 'color', '#ff0000');
graph.setNodeAttribute(nodeId, 'hidden', true);
```

### Hooks Applied in App.tsx
```typescript
useApplyFilters();      // Sets hidden based on filter state
useApplyColorScheme();  // Sets color based on display settings
useApplyHighlights();   // Sets color/highlighted for paths, cycles, selection
useApplyLayout();       // Runs ForceAtlas2 and positions nodes
useApplyEdgeBundling(); // Applies edge curvature
```

### Stores Overview

| Store | Purpose | Key State |
|-------|---------|-----------|
| `appStore` | Graph data & metadata | `graph`, `rawData`, `packages`, `labels`, `stats` |
| `uiStore` | UI & interaction | `selectedNodeId`, `highlightedPath`, `highlightedCycles`, `searchQuery` |
| `filterStore` | Visibility filters | `excludedPackages`, `includedPackages`, `excludedLabels`, `includedLabels`, `showBinaryOnly` |
| `displayStore` | Color settings | `colorScheme` (package\|label\|binary) |
| `layoutStore` | Layout & clustering | `clusterByPackage`, `showHulls`, `layoutQuality`, `edgeBundling` |

### Please Label Format
```
//package:target           - local target
///subrepo//package:target - subrepo target
//pkg:target#subtarget     - subtarget
:target                    - relative (same package)
```
Parser: `src/lib/graph/labelParser.ts`

### Filtering Logic
Filters use exclusion with include overrides:
- `excludedPackages` - hierarchical (excluding "src" hides "src/cli" too)
- `includedPackages` - overrides parent exclusion (include "src/cli" shows it even if "src" excluded)
- Same pattern for `excludedLabels`/`includedLabels`
- `showBinaryOnly` - only show binary targets

### Edge Direction
Edges go from **dependent → dependency**:
- If A depends on B, edge is A → B
- Path finding searches both directions

### Node Attributes
```typescript
interface GraphNodeAttributes {
  label: string;          // Display label
  x, y: number;           // Position
  size: number;           // Node size
  color: string;          // Current color
  originalColor?: string; // Pre-highlight color (for restore)
  hidden: boolean;        // Filtered out
  highlighted: boolean;   // Part of path/cycle
  selected: boolean;      // Currently selected
  package: string;        // Package path
  targetName: string;     // Target name
  binary: boolean;        // Is binary target
  labels: string[];       // Rule labels
  inDegree, outDegree: number;
  rawData: PlzTarget;     // Original JSON data
}
```

## Data Flow
```
JSON Upload → parseGraph() → Graphology instance → appStore.graph
                                    ↓
                    useApplyFilters()      → sets hidden
                    useApplyColorScheme()  → sets color
                    useApplyHighlights()   → sets color for paths/selection
                    useApplyLayout()       → sets x, y positions
                    useApplyEdgeBundling() → sets curvature
                                    ↓
                            Sigma.js renders
```

## Common Tasks

### Adding a new analysis feature
1. Create algorithm in `src/lib/analysis/`
2. Add UI to `src/components/panels/AnalysisPanel.tsx`
3. Use `highlightPath()` or `highlightCycles()` from uiStore to highlight results

### Adding a new filter
1. Add state to `src/stores/filterStore.ts`
2. Update `src/hooks/useFilters.ts` to apply it
3. Add UI to `src/components/panels/FilterPanel.tsx`

### Adding a new display option
1. Add state to `src/stores/displayStore.ts` or `layoutStore.ts`
2. Create/modify appropriate hook in `src/hooks/`
3. Add UI to `src/components/panels/DisplayOptionsPanel.tsx`

### Modifying node appearance
1. For static changes at parse time: modify `src/lib/graph/parser.ts`
2. For dynamic changes: create/modify hook in `src/hooks/`
3. Use `originalColor` to preserve color before highlighting, restore after

### Triggering a re-layout
```typescript
const triggerRelayout = useLayoutStore((s) => s.triggerRelayout);
triggerRelayout(); // Increments layoutVersion, causing useApplyLayout to re-run
```

## Architecture Decisions

- **Exclusion-based filtering**: All items shown by default. Users uncheck to hide. Include overrides allow showing specific children of excluded parents.
- **Direct graph mutation**: Sigma reducers have closure issues, so hooks modify Graphology attributes directly.
- **localStorage persistence**: Graph data saved to localStorage and auto-loaded on app start.
- **WebGL rendering**: Sigma uses WebGL for performance with large graphs. PNG export uses html-to-image library.
