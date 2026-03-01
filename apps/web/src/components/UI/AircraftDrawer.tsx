import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';

function drawAltitudeGauge(ctx: CanvasRenderingContext2D, w: number, h: number, altitude: number) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;

  // Background
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0f18';
  ctx.fill();
  ctx.strokeStyle = '#1a3040';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Scale arc (270 degrees, from 135 to 405)
  const startAngle = (135 * Math.PI) / 180;
  const endAngle = (405 * Math.PI) / 180;
  const maxAlt = 45000;

  // Tick marks
  for (let i = 0; i <= 9; i++) {
    const frac = i / 9;
    const angle = startAngle + frac * (endAngle - startAngle);
    const inner = r - 12;
    const outer = r - 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = '#334455';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels
    const labelR = r - 20;
    const label = `${i * 5}`;
    ctx.font = '7px monospace';
    ctx.fillStyle = '#556677';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
  }

  // Value arc (colored based on altitude)
  const altFrac = Math.min(altitude / maxAlt, 1);
  const valAngle = startAngle + altFrac * (endAngle - startAngle);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, startAngle, valAngle);
  const altColor = altitude < 5000 ? '#00ff88' : altitude < 15000 ? '#44ddff' : altitude < 30000 ? '#ffaa00' : '#ff4488';
  ctx.strokeStyle = altColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Needle
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(valAngle) * (r - 14), cy + Math.sin(valAngle) * (r - 14));
  ctx.strokeStyle = altColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = altColor;
  ctx.fill();

  // Value text
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(altitude).toLocaleString()}`, cx, cy + 14);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#667788';
  ctx.fillText('FT', cx, cy + 23);

  // Title
  ctx.font = '7px monospace';
  ctx.fillStyle = '#667788';
  ctx.fillText('ALT', cx, cy - r + 16);
}

function drawSpeedGauge(ctx: CanvasRenderingContext2D, w: number, h: number, speed: number) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0f18';
  ctx.fill();
  ctx.strokeStyle = '#1a3040';
  ctx.lineWidth = 2;
  ctx.stroke();

  const startAngle = (135 * Math.PI) / 180;
  const endAngle = (405 * Math.PI) / 180;
  const maxSpeed = 600;

  for (let i = 0; i <= 6; i++) {
    const frac = i / 6;
    const angle = startAngle + frac * (endAngle - startAngle);
    const inner = r - 12;
    const outer = r - 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = '#334455';
    ctx.lineWidth = 1;
    ctx.stroke();

    const labelR = r - 20;
    ctx.font = '7px monospace';
    ctx.fillStyle = '#556677';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i * 100}`, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
  }

  const spdFrac = Math.min(speed / maxSpeed, 1);
  const valAngle = startAngle + spdFrac * (endAngle - startAngle);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, startAngle, valAngle);
  const spdColor = speed < 200 ? '#44ddff' : speed < 400 ? '#00ff88' : '#ffaa00';
  ctx.strokeStyle = spdColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(valAngle) * (r - 14), cy + Math.sin(valAngle) * (r - 14));
  ctx.strokeStyle = spdColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = spdColor;
  ctx.fill();

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(speed)}`, cx, cy + 14);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#667788';
  ctx.fillText('KTS', cx, cy + 23);
  ctx.fillText('SPD', cx, cy - r + 16);
}

function drawHeadingGauge(ctx: CanvasRenderingContext2D, w: number, h: number, heading: number) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0f18';
  ctx.fill();
  ctx.strokeStyle = '#1a3040';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cardinal directions
  const dirs = ['N', 'E', 'S', 'W'];
  const hdgRad = (heading * Math.PI) / 180;

  for (let i = 0; i < 36; i++) {
    const angle = (i * 10 * Math.PI) / 180 - hdgRad - Math.PI / 2;
    const isCard = i % 9 === 0;
    const inner = r - (isCard ? 14 : 10);
    const outer = r - 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = isCard ? '#556677' : '#223344';
    ctx.lineWidth = isCard ? 1.5 : 0.5;
    ctx.stroke();
  }

  // Cardinal labels (rotated with compass)
  dirs.forEach((d, i) => {
    const angle = (i * 90 * Math.PI) / 180 - hdgRad - Math.PI / 2;
    const labelR = r - 22;
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = d === 'N' ? '#ff4444' : '#556677';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
  });

  // Fixed heading pointer at top
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 2);
  ctx.lineTo(cx - 4, cy - r + 8);
  ctx.lineTo(cx + 4, cy - r + 8);
  ctx.closePath();
  ctx.fillStyle = '#00ff88';
  ctx.fill();

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(heading)}`, cx, cy + 6);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#667788';
  ctx.fillText('DEG', cx, cy + 16);
  ctx.fillText('HDG', cx, cy - r + 16);
}

function drawVerticalRateBar(ctx: CanvasRenderingContext2D, w: number, h: number, vRate: number) {
  const barW = 12;
  const barH = h - 30;
  const barX = (w - barW) / 2;
  const barY = 15;
  const midY = barY + barH / 2;

  // Background
  ctx.fillStyle = '#0a0f18';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1a3040';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

  // Bar background
  ctx.fillStyle = '#0d1520';
  ctx.fillRect(barX, barY, barW, barH);

  // Center line
  ctx.beginPath();
  ctx.moveTo(barX - 3, midY);
  ctx.lineTo(barX + barW + 3, midY);
  ctx.strokeStyle = '#334455';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Scale ticks
  const maxRate = 3000;
  for (let i = -3; i <= 3; i++) {
    const y = midY - (i / 3) * (barH / 2);
    ctx.beginPath();
    ctx.moveTo(barX - 2, y);
    ctx.lineTo(barX, y);
    ctx.strokeStyle = '#334455';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Value bar
  const clampedRate = Math.max(-maxRate, Math.min(maxRate, vRate));
  const barFrac = clampedRate / maxRate;
  const fillH = Math.abs(barFrac) * (barH / 2);
  const color = vRate > 100 ? '#00ff88' : vRate < -100 ? '#ff4444' : '#44ddff';

  if (vRate > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(barX + 1, midY - fillH, barW - 2, fillH);
  } else if (vRate < 0) {
    ctx.fillStyle = color;
    ctx.fillRect(barX + 1, midY, barW - 2, fillH);
  }

  // Value text
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(`${vRate > 0 ? '+' : ''}${Math.round(vRate)}`, w / 2, h - 4);

  // Title
  ctx.font = '6px monospace';
  ctx.fillStyle = '#667788';
  ctx.fillText('VS', w / 2, 10);
}

export function AircraftDrawer() {
  const selectedAircraft = useMapStore((s) => s.selectedAircraft);
  const setSelectedAircraft = useMapStore((s) => s.setSelectedAircraft);
  const aircraft = useTelemetryStore((s) => s.aircraft);
  const ac = selectedAircraft ? aircraft.get(selectedAircraft) : null;

  const altRef = useRef<HTMLCanvasElement>(null);
  const spdRef = useRef<HTMLCanvasElement>(null);
  const hdgRef = useRef<HTMLCanvasElement>(null);
  const vsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ac) return;
    const dpr = window.devicePixelRatio || 1;

    // Altitude gauge
    if (altRef.current) {
      const c = altRef.current;
      const w = 90, h = 90;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      drawAltitudeGauge(ctx, w, h, ac.altitude);
    }

    // Speed gauge
    if (spdRef.current) {
      const c = spdRef.current;
      const w = 90, h = 90;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      drawSpeedGauge(ctx, w, h, ac.velocity);
    }

    // Heading gauge
    if (hdgRef.current) {
      const c = hdgRef.current;
      const w = 90, h = 90;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      drawHeadingGauge(ctx, w, h, ac.heading);
    }

    // VS bar
    if (vsRef.current) {
      const c = vsRef.current;
      const w = 30, h = 90;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      drawVerticalRateBar(ctx, w, h, ac.verticalRate);
    }
  }, [ac]);

  const vs = ac?.verticalRate ?? 0;
  const vsLabel = vs > 100 ? 'CLIMBING' : vs < -100 ? 'DESCENDING' : 'LEVEL';
  const vsColor = vs > 100 ? '#00ff88' : vs < -100 ? '#ff4444' : '#44ddff';

  return (
    <AnimatePresence>
      {ac && (
        <motion.div
          key="aircraft-drawer"
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ duration: 0.3, type: 'spring', damping: 20 }}
          className="aircraft-drawer"
        >
          <div className="drawer-header">
            <div className="drawer-callsign">
              <span className="drawer-bracket">[</span>
              <span className="drawer-name">{ac.callsign || 'UNKNOWN'}</span>
              <span className="drawer-bracket">]</span>
              <span className="drawer-icao">{ac.icao24.toUpperCase()}</span>
            </div>
            <div className="drawer-status">
              <span className="drawer-squawk">SQK {ac.squawk}</span>
              <span className="drawer-cat">{ac.category || '--'}</span>
              <span className="drawer-vs" style={{ color: vsColor }}>{vsLabel}</span>
            </div>
            <button className="drawer-close" onClick={() => setSelectedAircraft(null)}>X</button>
          </div>
          <div className="drawer-gauges">
            <canvas ref={altRef} className="gauge-canvas" />
            <canvas ref={spdRef} className="gauge-canvas" />
            <canvas ref={hdgRef} className="gauge-canvas" />
            <canvas ref={vsRef} className="gauge-canvas-vs" />
          </div>
          <div className="drawer-data">
            <div className="drawer-data-row">
              <span className="drawer-label">LAT</span>
              <span className="drawer-value">{ac.latitude.toFixed(5)}</span>
            </div>
            <div className="drawer-data-row">
              <span className="drawer-label">LON</span>
              <span className="drawer-value">{ac.longitude.toFixed(5)}</span>
            </div>
            <div className="drawer-data-row">
              <span className="drawer-label">GND</span>
              <span className="drawer-value">{ac.onGround ? 'YES' : 'NO'}</span>
            </div>
            <div className="drawer-data-row">
              <span className="drawer-label">TRAIL</span>
              <span className="drawer-value">{ac.trail?.length || 0} pts</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
