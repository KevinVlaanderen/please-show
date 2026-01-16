import { create } from 'zustand';

export type ClusteringStrength = 'weak' | 'strong';
export type LayoutQuality = 'fast' | 'balanced' | 'quality';

interface LayoutState {
  clusterByPackage: boolean;
  clusteringStrength: ClusteringStrength;
  layoutVersion: number;
  showHulls: boolean;
  layoutQuality: LayoutQuality;
  dissuadeHubs: boolean;
  setClusterByPackage: (enabled: boolean) => void;
  setClusteringStrength: (strength: ClusteringStrength) => void;
  triggerRelayout: () => void;
  setShowHulls: (show: boolean) => void;
  setLayoutQuality: (quality: LayoutQuality) => void;
  setDissuadeHubs: (enabled: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  clusterByPackage: true,
  clusteringStrength: 'weak',
  layoutVersion: 0,
  showHulls: false,
  layoutQuality: 'balanced',
  dissuadeHubs: true,
  setClusterByPackage: (enabled) => set({ clusterByPackage: enabled }),
  setClusteringStrength: (strength) => set({ clusteringStrength: strength }),
  triggerRelayout: () => set((state) => ({ layoutVersion: state.layoutVersion + 1 })),
  setShowHulls: (show) => set({ showHulls: show }),
  setLayoutQuality: (quality) => set({ layoutQuality: quality }),
  setDissuadeHubs: (enabled) => set({ dissuadeHubs: enabled }),
}));
