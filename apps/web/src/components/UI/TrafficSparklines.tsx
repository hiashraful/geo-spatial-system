import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

function drawSparkline(
  canvas: HTMLCanvasElement,
  data: number[],
  color: string,
  label: string,
  currentValue: number
) {
  const dpr = window.devicePixelRatio || 1;
  const w = 130;
  const h = 32;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Label
  ctx.font = '7px monospace';
  ctx.fillStyle = '#556677';
  ctx.textBaseline = 'top';
  ctx.fillText(label, 2, 1);

  // Current value
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.fillText(String(currentValue), w - 2, 1);

  if (data.length < 2) return;

  const chartTop = 13;
  const chartH = h - chartTop - 2;
  const max = Math.max(1, ...data);
  const step = (w - 4) / (data.length - 1);

  // Fill area
  ctx.beginPath();
  ctx.moveTo(2, chartTop + chartH);
  for (let i = 0; i < data.length; i++) {
    const x = 2 + i * step;
    const y = chartTop + chartH - (data[i] / max) * chartH;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(2 + (data.length - 1) * step, chartTop + chartH);
  ctx.closePath();
  ctx.fillStyle = color + '15';
  ctx.fill();

  // Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = 2 + i * step;
    const y = chartTop + chartH - (data[i] / max) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Endpoint dot
  const lastX = 2 + (data.length - 1) * step;
  const lastY = chartTop + chartH - (data[data.length - 1] / max) * chartH;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function TrafficSparklines() {
  const tracksRef = useRef<HTMLCanvasElement>(null);
  const detsRef = useRef<HTMLCanvasElement>(null);
  const alertsRef = useRef<HTMLCanvasElement>(null);

  const history = useTelemetryStore((s) => s.history);
  const pushHistory = useTelemetryStore((s) => s.pushHistory);

  // Push history point every 5 seconds
  useEffect(() => {
    const iv = setInterval(pushHistory, 5000);
    // Push initial point
    pushHistory();
    return () => clearInterval(iv);
  }, [pushHistory]);

  // Draw sparklines
  useEffect(() => {
    const tracks = history.map((h) => h.tracks);
    const dets = history.map((h) => h.detections);
    const alerts = history.map((h) => h.alerts);

    if (tracksRef.current) {
      drawSparkline(tracksRef.current, tracks, '#00ff88', 'TRACKS', tracks[tracks.length - 1] || 0);
    }
    if (detsRef.current) {
      drawSparkline(detsRef.current, dets, '#44aaff', 'DETECTIONS', dets[dets.length - 1] || 0);
    }
    if (alertsRef.current) {
      drawSparkline(alertsRef.current, alerts, '#ff6644', 'ALERTS', alerts[alerts.length - 1] || 0);
    }
  }, [history]);

  return (
    <div className="traffic-sparklines">
      <canvas ref={tracksRef} />
      <canvas ref={detsRef} />
      <canvas ref={alertsRef} />
    </div>
  );
}
