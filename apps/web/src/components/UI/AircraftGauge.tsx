import { useRef, useEffect } from 'react';

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color?: string;
  width?: number;
  height?: number;
}

export function AircraftGauge({ value, max, label, unit, color = '#00ff88', width = 100, height = 50 }: GaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height - 4;
    const radius = height - 10;

    // Arc background
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.stroke();

    // Value arc
    const pct = Math.min(1, Math.max(0, value / max));
    const endAngle = Math.PI + pct * Math.PI;

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle);
    ctx.stroke();

    // Needle
    const needleAngle = Math.PI + pct * Math.PI;
    const needleLen = radius - 5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(needleAngle) * needleLen,
      centerY + Math.sin(needleAngle) * needleLen
    );
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#8b949e';
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, centerX, 9);

    // Value text
    ctx.fillStyle = color;
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(value)}${unit}`, centerX, centerY - 6);

    // Border
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  }, [value, max, label, unit, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block', borderRadius: '2px' }}
    />
  );
}
