import { useSigma } from '@react-sigma/core';
import { useCallback } from 'react';

export function GraphControls() {
  const sigma = useSigma();

  const handleZoomIn = useCallback(() => {
    const camera = sigma.getCamera();
    camera.animatedZoom({ duration: 200 });
  }, [sigma]);

  const handleZoomOut = useCallback(() => {
    const camera = sigma.getCamera();
    camera.animatedUnzoom({ duration: 200 });
  }, [sigma]);

  const handleFitToScreen = useCallback(() => {
    const camera = sigma.getCamera();
    camera.animatedReset({ duration: 200 });
  }, [sigma]);

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
      <ControlButton onClick={handleZoomIn} title="Zoom in">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
        </svg>
      </ControlButton>
      <ControlButton onClick={handleZoomOut} title="Zoom out">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
        </svg>
      </ControlButton>
      <div className="border-t border-slate-200 my-1" />
      <ControlButton onClick={handleFitToScreen} title="Fit to screen">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </ControlButton>
    </div>
  );
}

function ControlButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
    >
      {children}
    </button>
  );
}
