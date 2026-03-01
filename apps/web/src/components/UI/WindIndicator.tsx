import { useRef, useEffect, useState } from 'react';

interface WindData {
  direction: number; // degrees (where wind is coming FROM)
  speed: number;     // knots
  gusts: number;     // knots
}

// Simulated wind data - changes slowly over time
function getSimulatedWind(): WindData {
  const t = Date.now() / 60000; // changes over minutes
  return {
    direction: (220 + Math.sin(t * 0.3) * 30 + 360) % 360,
    speed: Math.round(12 + Math.sin(t * 0.5) * 8),
    gusts: Math.round(18 + Math.sin(t * 0.7) * 10),
  };
}

export function WindIndicator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wind, setWind] = useState<WindData>(getSimulatedWind);

  // Update wind every 3 seconds
  useEffect(() => {
    const iv = setInterval(() => setWind(getSimulatedWind()), 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 80;
    const h = 80;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = 28;

    // Outer ring
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Tick marks at 45-degree intervals
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45 - 90) * (Math.PI / 180);
      const inner = r - 4;
      const outer = r;
      ctx.strokeStyle = '#1a233288';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    // Wind direction arrow (points in the direction wind is GOING TO)
    const windToAngle = ((wind.direction + 180) % 360 - 90) * (Math.PI / 180);

    // Arrow body
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(windToAngle) * (r - 8), cy - Math.sin(windToAngle) * (r - 8));
    ctx.lineTo(cx + Math.cos(windToAngle) * (r - 8), cy + Math.sin(windToAngle) * (r - 8));
    ctx.stroke();

    // Arrowhead
    const headLen = 8;
    const headAngle = 0.5;
    const tipX = cx + Math.cos(windToAngle) * (r - 8);
    const tipY = cy + Math.sin(windToAngle) * (r - 8);

    ctx.fillStyle = '#44aaff';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - Math.cos(windToAngle - headAngle) * headLen,
      tipY - Math.sin(windToAngle - headAngle) * headLen
    );
    ctx.lineTo(
      tipX - Math.cos(windToAngle + headAngle) * headLen,
      tipY - Math.sin(windToAngle + headAngle) * headLen
    );
    ctx.closePath();
    ctx.fill();

    // Center dot
    ctx.fillStyle = '#44aaff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Speed text in center
    ctx.fillStyle = '#44aaff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${wind.speed}kt`, cx, cy + 15);

    // Direction label at top
    ctx.fillStyle = '#8b949e';
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(wind.direction)}deg`, cx, 10);

    // "WIND" label
    ctx.fillStyle = '#8b949e';
    ctx.font = '6px "JetBrains Mono", monospace';
    ctx.fillText('WIND', cx, h - 4);

    // Gust indicator
    if (wind.gusts > wind.speed + 3) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`G${wind.gusts}`, w - 4, h - 4);
    }

    // Border
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
  }, [wind]);

  return (
    <div className="wind-indicator">
      <canvas
        ref={canvasRef}
        style={{ width: 80, height: 80, display: 'block', borderRadius: '2px' }}
      />
    </div>
  );
}
