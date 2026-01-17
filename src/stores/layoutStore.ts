import { create } from 'zustand';

export type ClusteringStrength = 'weak' | 'strong';
export type LayoutQuality = 'fast' | 'balanced' | 'quality';

interface LayoutState {
  clusterByPackage: boolean;
  clusteringStrength: ClusteringStrength;
  hierarchicalLayout: boolean;
  layoutVersion: number;
  hullVersion: number;
  showHulls: boolean;
  layoutQuality: LayoutQuality;
  dissuadeHubs: boolean;
  edgeBundling: boolean;
  setClusterByPackage: (enabled: boolean) => void;
  setClusteringStrength: (strength: ClusteringStrength) => void;
  setHierarchicalLayout: (enabled: boolean) => void;
  triggerRelayout: () => void;
  incrementHullVersion: () => void;
  setShowHulls: (show: boolean) => void;
  setLayoutQuality: (quality: LayoutQuality) => void;
  setDissuadeHubs: (enabled: boolean) => void;
  setEdgeBundling: (enabled: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  clusterByPackage: true,
  clusteringStrength: 'weak',
  hierarchicalLayout: false,
  layoutVersion: 0,
  hullVersion: 0,
  showHulls: false,
  layoutQuality: 'balanced',
  dissuadeHubs: true,
  edgeBundling: true,
  setClusterByPackage: (enabled) => set({ clusterByPackage: enabled }),
  setClusteringStrength: (strength) => set({ clusteringStrength: strength }),
  setHierarchicalLayout: (enabled) => set({ hierarchicalLayout: enabled }),
  triggerRelayout: () => set((state) => ({ layoutVersion: state.layoutVersion + 1 })),
  incrementHullVersion: () => set((state) => ({ hullVersion: state.hullVersion + 1 })),
  setShowHulls: (show) => set({ showHulls: show }),
  setLayoutQuality: (quality) => set({ layoutQuality: quality }),
  setDissuadeHubs: (enabled) => set({ dissuadeHubs: enabled }),
  setEdgeBundling: (enabled) => set({ edgeBundling: enabled }),
}));
