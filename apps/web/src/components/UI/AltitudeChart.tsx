import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

const BANDS = [
  { label: '0-10K', min: 0, max: 10000, color: '#00ff88' },
  { label: '10-20K', min: 10000, max: 20000, color: '#44ddff' },
  { label: '20-30K', min: 20000, max: 30000, color: '#ffaa00' },
  { label: '30-40K', min: 30000, max: 40000, color: '#ff4488' },
  { label: '40K+', min: 40000, max: Infinity, color: '#cc44ff' },
];

export function AltitudeChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aircraft = useTelemetryStore((s) => s.aircraft);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 280;
    const h = 50;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Count aircraft per band
    const counts = BANDS.map(() => 0);
    for (const ac of aircraft.values()) {
      for (let i = 0; i < BANDS.length; i++) {
        if (ac.altitude >= BANDS[i].min && ac.altitude < BANDS[i].max) {
          counts[i]++;
          break;
        }
      }
    }

    const maxCount = Math.max(1, ...counts);
    const barW = (w - 10) / BANDS.length - 4;
    const barMaxH = h - 22;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw bars
    for (let i = 0; i < BANDS.length; i++) {
      const x = 5 + i * (barW + 4);
      const barH = (counts[i] / maxCount) * barMaxH;
      const y = h - 12 - barH;

      // Bar
      ctx.fillStyle = BANDS[i].color + '44';
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = BANDS[i].color;
      ctx.fillRect(x, y, barW, 2); // Top accent

      // Count label
      if (counts[i] > 0) {
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = BANDS[i].color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(counts[i]), x + barW / 2, y - 1);
      }

      // Band label
      ctx.font = '7px monospace';
      ctx.fillStyle = '#556677';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(BANDS[i].label, x + barW / 2, h - 10);
    }
  }, [aircraft]);

  return (
    <div className="altitude-chart">
      <div className="chart-label">ALT DISTRIBUTION</div>
      <canvas ref={canvasRef} />
    </div>
  );
}
