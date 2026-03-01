import { useRef, useEffect } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

const RADAR_SIZE = 160;
const CENTER = RADAR_SIZE / 2;
const NYC_LAT = 40.7128;
const NYC_LON = -74.006;
const SCALE = 120; // pixels per degree

export function MiniRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aircraft = useTelemetryStore((s) => s.aircraft);
  const sweepAngle = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

      // Background
      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);

      // Range rings
      ctx.strokeStyle = '#1a2332';
      ctx.lineWidth = 0.5;
      for (let r = 20; r <= 70; r += 25) {
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cross hairs
      ctx.strokeStyle = '#1a233266';
      ctx.beginPath();
      ctx.moveTo(CENTER, 5);
      ctx.lineTo(CENTER, RADAR_SIZE - 5);
      ctx.moveTo(5, CENTER);
      ctx.lineTo(RADAR_SIZE - 5, CENTER);
      ctx.stroke();

      // Sweep line
      sweepAngle.current = (sweepAngle.current + 0.02) % (Math.PI * 2);
      const sweepX = CENTER + Math.cos(sweepAngle.current) * 75;
      const sweepY = CENTER + Math.sin(sweepAngle.current) * 75;

      const gradient = ctx.createLinearGradient(CENTER, CENTER, sweepX, sweepY);
      gradient.addColorStop(0, '#00ff8800');
      gradient.addColorStop(1, '#00ff8866');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // Sweep trail (fading arc)
      ctx.strokeStyle = '#00ff8811';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, 60, sweepAngle.current - 0.5, sweepAngle.current);
      ctx.stroke();

      // Aircraft blips
      const acList = Array.from(aircraft.values());
      for (const ac of acList) {
        const dx = (ac.longitude - NYC_LON) * SCALE;
        const dy = -(ac.latitude - NYC_LAT) * SCALE;
        const px = CENTER + dx;
        const py = CENTER + dy;

        if (px < 2 || px > RADAR_SIZE - 2 || py < 2 || py > RADAR_SIZE - 2) continue;

        // Blip color based on altitude
        const altFactor = Math.min(1, ac.altitude / 40000);
        const r = Math.round(0 + altFactor * 100);
        const g = Math.round(200 + altFactor * 55);
        const b = Math.round(100 + altFactor * 50);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);

        // Direction indicator
        const headRad = (ac.heading * Math.PI) / 180;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.sin(headRad) * 6, py - Math.cos(headRad) * 6);
        ctx.stroke();
      }

      // Center dot
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, 2, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#1a2332';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, RADAR_SIZE, RADAR_SIZE);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [aircraft]);

  return (
    <div className="mini-radar">
      <canvas
        ref={canvasRef}
        width={RADAR_SIZE}
        height={RADAR_SIZE}
        style={{ display: 'block', borderRadius: '4px' }}
      />
      <div className="radar-label">AREA RADAR</div>
    </div>
  );
}
