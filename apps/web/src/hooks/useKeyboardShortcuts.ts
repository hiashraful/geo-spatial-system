import { useEffect } from 'react';
import { useMapStore } from '../store/useMapStore';

export function useKeyboardShortcuts() {
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const setSelectedAircraft = useMapStore((s) => s.setSelectedAircraft);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const clearMeasurePoints = useMapStore((s) => s.clearMeasurePoints);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Capture shortcut: Ctrl+Shift+S
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const captureBtn = document.querySelector('.capture-btn') as HTMLButtonElement;
        if (captureBtn) captureBtn.click();
        return;
      }

      switch (e.key.toLowerCase()) {
        case '1':
          toggleLayer('aircraft');
          break;
        case '2':
          toggleLayer('trails');
          break;
        case '3':
          toggleLayer('geofences');
          break;
        case '4':
          toggleLayer('cameras');
          break;
        case '5':
          toggleLayer('detections');
          break;
        case '6':
          toggleLayer('heatmap');
          break;
        case '7':
          toggleLayer('buildings');
          break;
        case '8':
          toggleLayer('grid');
          break;
        case 'm':
          // Toggle measure tool
          {
            const current = useMapStore.getState().activeTool;
            if (current === 'measure') {
              setActiveTool('none');
              clearMeasurePoints();
            } else {
              setActiveTool('measure');
            }
          }
          break;
        case 'escape':
          {
            const tool = useMapStore.getState().activeTool;
            if (tool !== 'none') {
              setActiveTool('none');
              clearMeasurePoints();
            } else {
              setSelectedAircraft(null);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleLayer, setSelectedAircraft, setActiveTool, clearMeasurePoints]);
}
