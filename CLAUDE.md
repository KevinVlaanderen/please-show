# Please Show - Development Guide

## Project Overview
A web tool that visualizes Please Build rule graphs. Loads JSON from `plz query graph --output json` and renders an interactive graph visualization.

## Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Graph Rendering**: Sigma.js (WebGL) + Graphology
- **State Management**: Zustand
- **Styling**: Tailwind CSS

## Project Structure
```
src/
├── components/
│   ├── data-source/     # FileUpload, UrlInput
│   ├── graph/           # GraphCanvas, GraphControls
│   ├── layout/          # Sidebar
│   ├── panels/          # SearchPanel, FilterPanel, AnalysisPanel, etc.
│   └── ui/              # Reusable primitives (SearchInput)
├── hooks/
│   ├── useFilters.ts    # Applies exclusion-based filters to graph
│   ├── useColorScheme.ts # Applies color scheme to nodes
│   ├── useHighlights.ts # Applies path/analysis highlighting
│   └── useSearch.ts     # Search results hook
├── stores/
│   ├── appStore.ts      # Graph data, loading state
│   ├── uiStore.ts       # Selection, highlights, panel state
│   ├── filterStore.ts   # Excluded packages/labels
│   └── displayStore.ts  # Color scheme setting
├── lib/
│   ├── graph/
│   │   ├── parser.ts    # JSON to Graphology conversion
│   │   ├── labelParser.ts # Please label syntax parsing
│   │   ├── layout.ts    # ForceAtlas2 layout
│   │   └── colors.ts    # Color scheme utilities
│   ├── analysis/
│   │   ├── pathFinder.ts    # BFS shortest path
│   │   └── cycleDetector.ts # DFS cycle detection
│   └── export/
│       └── png.ts       # PNG export via html-to-image
└── types/
    ├── plz.ts           # Please Build JSON types
    └── graph.ts         # Graphology node/edge attributes
```

## Key Patterns

### Graph Modifications
All graph attribute changes (colors, visibility, highlighting) are done via hooks in `src/hooks/`. These run in App.tsx and directly modify the Graphology graph instance.

**Important**: Don't use Sigma's `nodeReducer`/`edgeReducer` for dynamic updates - they capture stale closures. Instead, modify graph attributes directly:
```typescript
graph.setNodeAttribute(nodeId, 'color', '#ff0000');
```

### Please Label Format
```
//package:target           - local target
///subrepo//package:target - subrepo target
//pkg:target#subtarget     - subtarget
:target                    - relative (same package)
```
Parser: `src/lib/graph/labelParser.ts`

### Filtering
Filters are **exclusion-based** (all checked by default, uncheck to hide):
- `excludedPackages` - hierarchical (excluding "src" hides "src/cli" too)
- `excludedLabels` - hides nodes with any excluded label
- `showBinaryOnly` - only show binary targets

### Edge Direction
In the graph, edges go from **dependent → dependency**:
- If A depends on B, edge is A → B
- Path finding searches both directions

## Commands
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Type check + production build
npm run preview  # Preview production build
```

## Common Tasks

### Adding a new analysis feature
1. Create algorithm in `src/lib/analysis/`
2. Add UI to `src/components/panels/AnalysisPanel.tsx`
3. Use `highlightPath()` from uiStore to highlight results

### Adding a new filter
1. Add state to `src/stores/filterStore.ts`
2. Update `src/hooks/useFilters.ts` to apply it
3. Add UI to `src/components/panels/FilterPanel.tsx`

### Modifying node appearance
1. For static changes: modify in `src/lib/graph/parser.ts`
2. For dynamic changes: create/modify hook in `src/hooks/`
3. Node attributes: color, size, hidden, highlighted, label

## Data Flow
```
JSON Upload → parseGraph() → Graphology instance → appStore.graph
                                    ↓
                    useApplyFilters() - sets hidden
                    useApplyColorScheme() - sets color
                    useApplyHighlights() - sets color for paths
                                    ↓
                            Sigma.js renders
```
