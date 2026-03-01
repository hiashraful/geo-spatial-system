import { useRef, useEffect, useState } from 'react';

const SIZE = 80;
const CENTER = SIZE / 2;

export function CompassRose() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    const handler = (e: CustomEvent<{ bearing: number }>) => {
      setBearing(e.detail.bearing);
    };
    window.addEventListener('map-bearing' as any, handler);
    return () => window.removeEventListener('map-bearing' as any, handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Background
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Outer ring
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 35, 0, Math.PI * 2);
    ctx.stroke();

    // Tick marks
    const bearingRad = (-bearing * Math.PI) / 180;
    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(bearingRad);

    for (let i = 0; i < 36; i++) {
      const angle = (i * 10 * Math.PI) / 180;
      const isMajor = i % 9 === 0;
      const len = isMajor ? 8 : 4;
      const inner = 27;

      ctx.strokeStyle = isMajor ? '#00ff88' : '#1a2332';
      ctx.lineWidth = isMajor ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.sin(angle) * inner, -Math.cos(angle) * inner);
      ctx.lineTo(Math.sin(angle) * (inner + len), -Math.cos(angle) * (inner + len));
      ctx.stroke();
    }

    // Cardinal direction labels
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // N (red)
    ctx.fillStyle = '#ff4444';
    ctx.fillText('N', 0, -20);

    // E
    ctx.fillStyle = '#8b949e';
    ctx.fillText('E', 20, 0);

    // S
    ctx.fillStyle = '#8b949e';
    ctx.fillText('S', 0, 20);

    // W
    ctx.fillStyle = '#8b949e';
    ctx.fillText('W', -20, 0);

    // North pointer (triangle)
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(0, -33);
    ctx.lineTo(-3, -27);
    ctx.lineTo(3, -27);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Center dot
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 2, 0, Math.PI * 2);
    ctx.fill();

    // Bearing readout
    ctx.fillStyle = '#00ff88';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const displayBearing = ((bearing % 360) + 360) % 360;
    ctx.fillText(`${displayBearing.toFixed(0)}`, CENTER, SIZE - 2);

    // Border
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, SIZE, SIZE);
  }, [bearing]);

  return (
    <div className="compass-rose">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={{ display: 'block', borderRadius: '4px' }}
      />
    </div>
  );
}
