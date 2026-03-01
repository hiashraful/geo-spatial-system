import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const history = useTelemetryStore((s) => s.history);
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement?.clientWidth || 600;
    const h = 36;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = 4;
    const barY = 18;
    const barH = 10;
    const barW = w - pad * 2;

    // Time axis background
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(pad, barY, barW, barH);
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, barY, barW, barH);

    // Time labels
    ctx.font = '7px monospace';
    ctx.fillStyle = '#556677';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('-5m', pad, 2);
    ctx.textAlign = 'center';
    ctx.fillText('-2.5m', pad + barW / 2, 2);
    ctx.textAlign = 'right';
    ctx.fillText('NOW', pad + barW, 2);

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const x = pad + (i / 10) * barW;
      ctx.fillStyle = '#1a2332';
      ctx.fillRect(x, barY, 1, barH);
    }

    if (history.length < 2) {
      ctx.font = '8px monospace';
      ctx.fillStyle = '#334455';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('COLLECTING DATA...', w / 2, barY + barH / 2);
      return;
    }

    // Draw track count as area fill
    const maxTracks = Math.max(1, ...history.map((h) => h.tracks));
    const step = barW / (history.length - 1);

    ctx.beginPath();
    ctx.moveTo(pad, barY + barH);
    for (let i = 0; i < history.length; i++) {
      const x = pad + i * step;
      const y = barY + barH - (history[i].tracks / maxTracks) * barH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(pad + (history.length - 1) * step, barY + barH);
    ctx.closePath();
    ctx.fillStyle = '#00ff8818';
    ctx.fill();

    // Track count line
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = pad + i * step;
      const y = barY + barH - (history[i].tracks / maxTracks) * barH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#00ff8866';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Alert event markers
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    for (const h of history) {
      if (h.alerts > 0) {
        const progress = (h.timestamp - fiveMinAgo) / (now - fiveMinAgo);
        if (progress >= 0 && progress <= 1) {
          const x = pad + progress * barW;
          // Red diamond marker
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.moveTo(x, barY - 2);
          ctx.lineTo(x + 3, barY + barH / 2);
          ctx.lineTo(x, barY + barH + 2);
          ctx.lineTo(x - 3, barY + barH / 2);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // "Now" indicator
    const nowX = pad + barW;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(nowX, barY - 1);
    ctx.lineTo(nowX + 2, barY + barH / 2);
    ctx.lineTo(nowX, barY + barH + 1);
    ctx.closePath();
    ctx.fill();

    // Bottom label
    ctx.font = '7px monospace';
    ctx.fillStyle = '#334455';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${history.length} SAMPLES | ${maxTracks} MAX TRACKS`, w / 2, barY + barH + 2);
  }, [history, geofenceAlerts]);

  return (
    <div className="timeline-strip">
      <canvas ref={canvasRef} />
    </div>
  );
}
