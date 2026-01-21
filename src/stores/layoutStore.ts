import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ClusteringStrength = 'weak' | 'strong';
export type LayoutQuality = 'fast' | 'balanced' | 'quality';
export type LayoutAlgorithm = 'forceAtlas2' | 'clusteredForceAtlas2' | 'hierarchical' | 'layered' | 'radial' | 'circular';
export type LayeredDirection = 'TB' | 'LR' | 'BT' | 'RL';

interface LayoutState {
  layoutAlgorithm: LayoutAlgorithm;
  layeredDirection: LayeredDirection;
  radialCenterNode: string | null;
  applyNoverlap: boolean;
  // Legacy settings (kept for backwards compatibility and some algorithms)
  clusterByPackage: boolean;
  clusteringStrength: ClusteringStrength;
  hierarchicalLayout: boolean;
  layoutVersion: number;
  hullVersion: number;
  showHulls: boolean;
  layoutQuality: LayoutQuality;
  dissuadeHubs: boolean;
  edgeBundling: boolean;
  setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => void;
  setLayeredDirection: (direction: LayeredDirection) => void;
  setRadialCenterNode: (nodeId: string | null) => void;
  setApplyNoverlap: (enabled: boolean) => void;
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

// Migration function to derive layoutAlgorithm from legacy settings
function deriveLayoutAlgorithm(
  clusterByPackage: boolean,
  hierarchicalLayout: boolean
): LayoutAlgorithm {
  if (clusterByPackage && hierarchicalLayout) {
    return 'hierarchical';
  } else if (clusterByPackage) {
    return 'clusteredForceAtlas2';
  }
  return 'forceAtlas2';
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layoutAlgorithm: 'clusteredForceAtlas2',
      layeredDirection: 'LR',
      radialCenterNode: null,
      applyNoverlap: false,
      clusterByPackage: true,
      clusteringStrength: 'weak',
      hierarchicalLayout: false,
      layoutVersion: 0,
      hullVersion: 0,
      showHulls: false,
      layoutQuality: 'balanced',
      dissuadeHubs: true,
      edgeBundling: true,
      setLayoutAlgorithm: (algorithm) => set({ layoutAlgorithm: algorithm }),
      setLayeredDirection: (direction) => set({ layeredDirection: direction }),
      setRadialCenterNode: (nodeId) => set({ radialCenterNode: nodeId }),
      setApplyNoverlap: (enabled) => set({ applyNoverlap: enabled }),
      setClusterByPackage: (enabled) => set({ clusterByPackage: enabled }),
      setClusteringStrength: (strength) => set({ clusteringStrength: strength }),
      setHierarchicalLayout: (enabled) => set({ hierarchicalLayout: enabled }),
      triggerRelayout: () => set((state) => ({ layoutVersion: state.layoutVersion + 1 })),
      incrementHullVersion: () => set((state) => ({ hullVersion: state.hullVersion + 1 })),
      setShowHulls: (show) => set({ showHulls: show }),
      setLayoutQuality: (quality) => set({ layoutQuality: quality }),
      setDissuadeHubs: (enabled) => set({ dissuadeHubs: enabled }),
      setEdgeBundling: (enabled) => set({ edgeBundling: enabled }),
    }),
    {
      name: 'please-show-layout',
      partialize: (state) => ({
        layoutAlgorithm: state.layoutAlgorithm,
        layeredDirection: state.layeredDirection,
        applyNoverlap: state.applyNoverlap,
        clusterByPackage: state.clusterByPackage,
        clusteringStrength: state.clusteringStrength,
        hierarchicalLayout: state.hierarchicalLayout,
        showHulls: state.showHulls,
        layoutQuality: state.layoutQuality,
        dissuadeHubs: state.dissuadeHubs,
        edgeBundling: state.edgeBundling,
      }),
      // Migration: derive layoutAlgorithm from legacy settings if not present
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<LayoutState>;
        const merged = { ...current, ...persistedState };

        // If layoutAlgorithm wasn't persisted but legacy settings were, derive it
        if (!persistedState.layoutAlgorithm && (persistedState.clusterByPackage !== undefined || persistedState.hierarchicalLayout !== undefined)) {
          merged.layoutAlgorithm = deriveLayoutAlgorithm(
            merged.clusterByPackage,
            merged.hierarchicalLayout
          );
        }

        return merged;
      },
    }
  )
);
