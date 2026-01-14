import { create } from 'zustand';

export type ClusteringStrength = 'weak' | 'strong';

interface LayoutState {
  clusterByPackage: boolean;
  clusteringStrength: ClusteringStrength;
  layoutVersion: number;
  showHulls: boolean;
  setClusterByPackage: (enabled: boolean) => void;
  setClusteringStrength: (strength: ClusteringStrength) => void;
  triggerRelayout: () => void;
  setShowHulls: (show: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  clusterByPackage: true,
  clusteringStrength: 'weak',
  layoutVersion: 0,
  showHulls: false,
  setClusterByPackage: (enabled) => set({ clusterByPackage: enabled }),
  setClusteringStrength: (strength) => set({ clusteringStrength: strength }),
  triggerRelayout: () => set((state) => ({ layoutVersion: state.layoutVersion + 1 })),
  setShowHulls: (show) => set({ showHulls: show }),
}));
