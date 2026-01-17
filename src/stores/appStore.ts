import { create } from 'zustand';
import Graph from 'graphology';
import type { PlzQueryOutput } from '../types/plz';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../types/graph';
import { parseGraph, getPackages, getLabels, getGraphStats } from '../lib/graph/parser';

const STORAGE_KEY = 'please-show-graph-data';

interface AppState {
  // Data
  rawData: PlzQueryOutput | null;
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes> | null;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Graph metadata
  packages: string[];
  labels: string[];
  stats: { nodeCount: number; edgeCount: number; packages: number } | null;

  // Actions
  loadData: (data: PlzQueryOutput) => void;
  loadFromUrl: (url: string) => Promise<void>;
  loadFromStorage: () => boolean;
  clearData: () => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  rawData: null,
  graph: null,
  isLoading: false,
  error: null,
  packages: [],
  labels: [],
  stats: null,

  loadData: (data) => {
    try {
      const graph = parseGraph(data);
      const packages = getPackages(graph);
      const labels = getLabels(graph);
      const stats = getGraphStats(graph);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }

      set({
        rawData: data,
        graph,
        packages,
        labels,
        stats,
        error: null,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to parse graph data' });
    }
  },

  loadFromUrl: async (url) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const graph = parseGraph(data);
      const packages = getPackages(graph);
      const labels = getLabels(graph);
      const stats = getGraphStats(graph);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }

      set({
        rawData: data,
        graph,
        packages,
        labels,
        stats,
        isLoading: false,
        error: null,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load data',
      });
    }
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as PlzQueryOutput;
        const graph = parseGraph(data);
        const packages = getPackages(graph);
        const labels = getLabels(graph);
        const stats = getGraphStats(graph);

        set({
          rawData: data,
          graph,
          packages,
          labels,
          stats,
          error: null,
        });
        return true;
      }
    } catch {
      // Ignore storage errors or invalid data
      localStorage.removeItem(STORAGE_KEY);
    }
    return false;
  },

  clearData: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      rawData: null,
      graph: null,
      packages: [],
      labels: [],
      stats: null,
      error: null,
    });
  },

  setError: (error) => set({ error }),
}));
