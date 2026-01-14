import { create } from 'zustand';

interface UIState {
  // Panel visibility
  sidebarOpen: boolean;
  detailsPanelOpen: boolean;

  // Selection
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Highlighting
  highlightedPath: string[];
  highlightedCycles: string[][];

  // Search
  searchQuery: string;
  searchOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDetailsPanelOpen: (open: boolean) => void;
  selectNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  highlightPath: (path: string[]) => void;
  highlightCycles: (cycles: string[][]) => void;
  clearHighlights: () => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  detailsPanelOpen: false,
  selectedNodeId: null,
  hoveredNodeId: null,
  highlightedPath: [],
  highlightedCycles: [],
  searchQuery: '',
  searchOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDetailsPanelOpen: (open) => set({ detailsPanelOpen: open }),

  selectNode: (id) =>
    set({
      selectedNodeId: id,
      detailsPanelOpen: id !== null,
    }),

  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  highlightPath: (path) => set({ highlightedPath: path }),
  highlightCycles: (cycles) => set({ highlightedCycles: cycles }),
  clearHighlights: () => set({ highlightedPath: [], highlightedCycles: [] }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchOpen: (open) => set({ searchOpen: open }),
}));
