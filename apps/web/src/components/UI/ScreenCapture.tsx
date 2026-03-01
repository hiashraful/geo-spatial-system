import { useState, useCallback } from 'react';

export function ScreenCapture() {
  const [capturing, setCapturing] = useState(false);

  const capture = useCallback(async () => {
    setCapturing(true);
    try {
      const map = (window as any).__map;
      if (!map) {
        console.warn('[Capture] Map not available');
        setCapturing(false);
        return;
      }

      // Get map canvas
      const mapCanvas = map.getCanvas() as HTMLCanvasElement;

      // Create composite canvas
      const w = mapCanvas.width;
      const h = mapCanvas.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      // Draw map
      ctx.drawImage(mapCanvas, 0, 0);

      // Add tactical overlay
      const dpr = window.devicePixelRatio || 1;
      const fontSize = 12 * dpr;
      const padding = 10 * dpr;

      // Top-left classification banner
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, w, (fontSize + padding * 2));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = '#00ff88';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').split('.')[0] + 'Z';
      ctx.fillText(`GEOINT TACTICAL CAPTURE // ${timestamp}`, padding, fontSize / 2 + padding);

      // Bottom-right coordinates
      const center = map.getCenter();
      const zoom = map.getZoom().toFixed(1);
      const coordText = `${center.lat.toFixed(5)}N ${center.lng.toFixed(5)}W | Z${zoom}`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      const bottomH = fontSize + padding * 2;
      ctx.fillRect(0, h - bottomH, w, bottomH);
      ctx.fillStyle = '#00ff88';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(coordText, w - padding, h - bottomH / 2);

      // Classification left
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffaa00';
      ctx.fillText('UNCLASSIFIED // FOUO', padding, h - bottomH / 2);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geoint-capture-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setCapturing(false);
      }, 'image/png');
    } catch (err) {
      console.error('[Capture] Error:', err);
      setCapturing(false);
    }
  }, []);

  return (
    <button
      className={`capture-btn ${capturing ? 'active' : ''}`}
      onClick={capture}
      title="Capture map screenshot (Ctrl+Shift+S)"
      disabled={capturing}
    >
      {capturing ? 'SAVING...' : 'CAPTURE'}
    </button>
  );
}
