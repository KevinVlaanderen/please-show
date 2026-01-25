import { create } from 'zustand';

interface UIState {
  // Panel visibility
  sidebarOpen: boolean;
  detailsPanelOpen: boolean;

  // Selection
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  focusedNodeId: string | null; // Node to center camera on

  // Highlighting
  highlightedPath: string[];
  highlightedCycles: string[][];

  // Inspection mode
  inspectionMode: 'both' | 'dependencies' | 'dependents';

  // Search
  searchQuery: string;
  searchOpen: boolean;

  // Node picking for path analysis
  pickingMode: 'inspect' | 'source' | 'target' | null;
  onNodePicked: ((nodeId: string) => void) | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDetailsPanelOpen: (open: boolean) => void;
  selectNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setFocusedNode: (id: string | null) => void;
  highlightPath: (path: string[]) => void;
  highlightCycles: (cycles: string[][]) => void;
  clearHighlights: () => void;
  setInspectionMode: (mode: 'both' | 'dependencies' | 'dependents') => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  setPickingMode: (mode: 'inspect' | 'source' | 'target' | null, callback: ((nodeId: string) => void) | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  detailsPanelOpen: false,
  selectedNodeId: null,
  hoveredNodeId: null,
  focusedNodeId: null,
  highlightedPath: [],
  highlightedCycles: [],
  inspectionMode: 'both',
  searchQuery: '',
  searchOpen: false,
  pickingMode: null,
  onNodePicked: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDetailsPanelOpen: (open) => set({ detailsPanelOpen: open }),

  selectNode: (id) =>
    set({
      selectedNodeId: id,
      detailsPanelOpen: id !== null,
    }),

  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setFocusedNode: (id) => set({ focusedNodeId: id }),

  highlightPath: (path) => set({ highlightedPath: path }),
  highlightCycles: (cycles) => set({ highlightedCycles: cycles }),
  clearHighlights: () => set({ highlightedPath: [], highlightedCycles: [] }),

  setInspectionMode: (mode) => set({ inspectionMode: mode }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchOpen: (open) => set({ searchOpen: open }),

  setPickingMode: (mode, callback) => set({ pickingMode: mode, onNodePicked: callback }),
}));
