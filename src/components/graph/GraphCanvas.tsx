import { useEffect } from 'react';
import { SigmaContainer, useRegisterEvents, useSigma } from '@react-sigma/core';
import '@react-sigma/core/lib/style.css';
import { useAppStore } from '../../stores/appStore';
import { useUIStore } from '../../stores/uiStore';
import { GraphControls } from './GraphControls';
import type { GraphNodeAttributes, GraphEdgeAttributes } from '../../types/graph';

function GraphEvents() {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const selectNode = useUIStore((state) => state.selectNode);
  const setHoveredNode = useUIStore((state) => state.setHoveredNode);

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        selectNode(event.node);
      },
      clickStage: () => {
        selectNode(null);
      },
      enterNode: (event) => {
        setHoveredNode(event.node);
        sigma.getGraph().setNodeAttribute(event.node, 'highlighted', true);
        sigma.refresh();
      },
      leaveNode: (event) => {
        setHoveredNode(null);
        sigma.getGraph().setNodeAttribute(event.node, 'highlighted', false);
        sigma.refresh();
      },
    });
  }, [registerEvents, selectNode, setHoveredNode, sigma]);

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
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const highlightedPath = useUIStore((state) => state.highlightedPath);

  if (!graph) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className}`}>
        <p className="text-slate-500">Load a graph to get started</p>
      </div>
    );
  }

  return (
    <SigmaContainer<GraphNodeAttributes, GraphEdgeAttributes>
      className={className}
      style={{ width: '100%', height: '100%' }}
      graph={graph}
      settings={{
        allowInvalidContainer: true,
        defaultNodeColor: '#6366f1',
        defaultEdgeColor: '#94a3b8',
        labelFont: 'system-ui, sans-serif',
        labelSize: 12,
        labelWeight: 'normal',
        labelColor: { color: '#1e293b' },
        renderLabels: true,
        renderEdgeLabels: false,
        enableEdgeEvents: false,
        zoomDuration: 200,
        nodeReducer: (node, data) => {
          const isSelected = node === selectedNodeId;
          const isInPath = highlightedPath.includes(node);

          return {
            ...data,
            size: isSelected ? data.size * 1.5 : data.size,
            color: isInPath ? '#dc2626' : data.color,
            zIndex: isSelected || isInPath ? 1 : 0,
          };
        },
      }}
    >
      <GraphEvents />
      <GraphLoader />
      <CameraController />
      <GraphControls />
    </SigmaContainer>
  );
}
