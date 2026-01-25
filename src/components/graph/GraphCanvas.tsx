import { useEffect, useMemo, useRef } from 'react';
import { SigmaContainer, useRegisterEvents, useSigma } from '@react-sigma/core';
import '@react-sigma/core/lib/style.css';
import { EdgeCurvedArrowProgram } from '@sigma/edge-curve';
import { EdgeLineProgram } from 'sigma/rendering';
import Graph from 'graphology';
import type { Settings } from 'sigma/settings';
import type { NodeDisplayData, PartialButFor } from 'sigma/types';
import { useAppStore } from '../../stores/appStore';
import { useUIStore } from '../../stores/uiStore';
import { GraphControls } from './GraphControls';
import { HullRenderer } from './HullRenderer';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

const SELECTED_HALO_COLOR = '#6366f1'; // indigo for selected node
const NEIGHBOR_HALO_COLOR = '#1e293b'; // dark slate for neighbors

type NodeDisplayDataWithSelected = PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'> & {
  selected?: boolean;
};

function drawNodeHover(
  context: CanvasRenderingContext2D,
  data: NodeDisplayDataWithSelected,
  settings: Settings<GraphNodeAttributes, GraphEdgeAttributes>
): void {
  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;

  context.font = `${weight} ${size}px ${font}`;

  // Measure label
  const label = data.label || '';
  const textWidth = context.measureText(label).width;
  const boxWidth = Math.round(textWidth + 8);
  const boxHeight = Math.round(size + 6);
  // Constant border thickness for all nodes
  const borderThickness = 3;
  const radius = data.size + borderThickness;

  // Choose halo color based on selected state
  const haloColor = data.selected ? SELECTED_HALO_COLOR : NEIGHBOR_HALO_COLOR;

  // Draw halo
  context.beginPath();
  context.arc(data.x, data.y, radius, 0, Math.PI * 2);
  context.fillStyle = haloColor;
  context.fill();

  // Draw node
  context.beginPath();
  context.arc(data.x, data.y, data.size, 0, Math.PI * 2);
  context.fillStyle = data.color;
  context.fill();

  // Draw label background
  context.fillStyle = '#ffffff';
  context.fillRect(data.x + data.size + 3, data.y - boxHeight / 2, boxWidth, boxHeight);

  // Draw label border
  context.strokeStyle = haloColor;
  context.lineWidth = 1;
  context.strokeRect(data.x + data.size + 3, data.y - boxHeight / 2, boxWidth, boxHeight);

  // Draw label text
  context.fillStyle = '#1e293b';
  context.fillText(label, data.x + data.size + 7, data.y + size / 3);
}

function GraphEvents() {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const selectNode = useUIStore((state) => state.selectNode);
  const setHoveredNode = useUIStore((state) => state.setHoveredNode);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const pickingMode = useUIStore((state) => state.pickingMode);
  const onNodePicked = useUIStore((state) => state.onNodePicked);
  const setPickingMode = useUIStore((state) => state.setPickingMode);
  const highlightPath = useUIStore((state) => state.highlightPath);

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        // If in picking mode, call the callback and exit picking mode
        if (pickingMode && onNodePicked) {
          onNodePicked(event.node);
          setPickingMode(null, null);
        } else {
          // Clear path highlighting when selecting a node
          highlightPath([]);
          selectNode(event.node);
        }
      },
      clickStage: () => {
        // Cancel picking mode on stage click
        if (pickingMode) {
          setPickingMode(null, null);
        } else {
          selectNode(null);
        }
      },
      enterNode: (event) => {
        setHoveredNode(event.node);
        sigma.getGraph().setNodeAttribute(event.node, 'highlighted', true);
        sigma.refresh();
      },
      leaveNode: (event) => {
        setHoveredNode(null);
        const graph = sigma.getGraph();
        const nodeId = event.node;

        // Check if node should remain highlighted (selected or neighbor of selected)
        const isSelected = graph.getNodeAttribute(nodeId, 'selected');
        const isNeighborOfSelected = selectedNodeId && graph.hasNode(selectedNodeId) &&
          graph.areNeighbors(nodeId, selectedNodeId);

        if (!isSelected && !isNeighborOfSelected) {
          graph.setNodeAttribute(nodeId, 'highlighted', false);
        }
        sigma.refresh();
      },
    });
  }, [registerEvents, selectNode, setHoveredNode, sigma, selectedNodeId, pickingMode, onNodePicked, setPickingMode, highlightPath]);

  return null;
}

function GraphLoader() {
  const sigma = useSigma();
  const graph = useAppStore((state) => state.graph);

  useEffect(() => {
    if (graph) {
      sigma.setGraph(graph);
      sigma.refresh();
    }
  }, [graph, sigma]);

  return null;
}

function CameraController() {
  const sigma = useSigma();
  const focusedNodeId = useUIStore((state) => state.focusedNodeId);
  const setFocusedNode = useUIStore((state) => state.setFocusedNode);

  useEffect(() => {
    if (!focusedNodeId) return;

    const graph = sigma.getGraph();
    if (graph.hasNode(focusedNodeId)) {
      const attrs = graph.getNodeAttributes(focusedNodeId);
      sigma.getCamera().animate({ x: attrs.x, y: attrs.y, ratio: 0.5 }, { duration: 300 });
    }

    // Clear the focused node after animating
    setFocusedNode(null);
  }, [focusedNodeId, sigma, setFocusedNode]);

  return null;
}

interface GraphCanvasProps {
  className?: string;
}

export function GraphCanvas({ className }: GraphCanvasProps) {
  const graph = useAppStore((state) => state.graph);
  const pickingMode = useUIStore((state) => state.pickingMode);

  // Memoize edge program classes to prevent unnecessary re-renders
  const edgeProgramClasses = useMemo(
    () => ({
      line: EdgeLineProgram,
      curved: EdgeCurvedArrowProgram,
    }),
    []
  );

  // Create a stable empty graph for SigmaContainer's initial prop.
  // GraphLoader will handle all graph updates via sigma.setGraph().
  // This prevents WebGL context loss when reloading the same graph.
  const emptyGraph = useRef(
    new Graph<GraphNodeAttributes, GraphEdgeAttributes>({ type: 'directed', allowSelfLoops: false })
  );

  if (!graph) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className}`}>
        <p className="text-slate-500">Load a graph to get started</p>
      </div>
    );
  }

  return (
    <SigmaContainer<GraphNodeAttributes, GraphEdgeAttributes>
      className={`${className} ${pickingMode ? 'cursor-crosshair' : ''}`}
      style={{ width: '100%', height: '100%' }}
      graph={emptyGraph.current}
      settings={{
        allowInvalidContainer: true,
        defaultNodeColor: '#6366f1',
        defaultEdgeColor: '#94a3b8',
        defaultEdgeType: 'curved',
        edgeProgramClasses,
        labelFont: 'system-ui, sans-serif',
        labelSize: 12,
        labelWeight: 'normal',
        labelColor: { color: '#1e293b' },
        renderLabels: true,
        renderEdgeLabels: false,
        enableEdgeEvents: false,
        zoomDuration: 200,
        defaultDrawNodeHover: drawNodeHover,
      }}
    >
      <GraphEvents />
      <GraphLoader />
      <CameraController />
      <HullRenderer />
      <GraphControls />
    </SigmaContainer>
  );
}
