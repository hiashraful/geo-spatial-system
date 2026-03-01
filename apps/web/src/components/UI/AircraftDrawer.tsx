import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';

interface HistoryEntry {
  altitude: number;
  velocity: number;
  timestamp: number;
}

function drawAltitudeGauge(ctx: CanvasRenderingContext2D, w: number, h: number, altitude: number) {
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
  const maxAlt = 45000;

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

    const labelR = r - 20;
    ctx.font = '7px monospace';
    ctx.fillStyle = '#556677';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i * 5}`, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
  }

  const altFrac = Math.min(altitude / maxAlt, 1);
  const valAngle = startAngle + altFrac * (endAngle - startAngle);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, startAngle, valAngle);
  const altColor = altitude < 5000 ? '#00ff88' : altitude < 15000 ? '#44ddff' : altitude < 30000 ? '#ffaa00' : '#ff4488';
  ctx.strokeStyle = altColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(valAngle) * (r - 14), cy + Math.sin(valAngle) * (r - 14));
  ctx.strokeStyle = altColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = altColor;
  ctx.fill();

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(altitude).toLocaleString()}`, cx, cy + 14);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#667788';
  ctx.fillText('FT', cx, cy + 23);
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

  dirs.forEach((d, i) => {
    const angle = (i * 90 * Math.PI) / 180 - hdgRad - Math.PI / 2;
    const labelR = r - 22;
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = d === 'N' ? '#ff4444' : '#556677';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
  });

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

  ctx.fillStyle = '#0a0f18';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1a3040';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

  ctx.fillStyle = '#0d1520';
  ctx.fillRect(barX, barY, barW, barH);

  ctx.beginPath();
  ctx.moveTo(barX - 3, midY);
  ctx.lineTo(barX + barW + 3, midY);
  ctx.strokeStyle = '#334455';
  ctx.lineWidth = 1;
  ctx.stroke();

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

  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(`${vRate > 0 ? '+' : ''}${Math.round(vRate)}`, w / 2, h - 4);

  ctx.font = '6px monospace';
  ctx.fillStyle = '#667788';
  ctx.fillText('VS', w / 2, 10);
}

function drawTrailMiniMap(ctx: CanvasRenderingContext2D, w: number, h: number, trail: [number, number][], acLng: number, acLat: number) {
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1a2332';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, w, h);

  if (trail.length < 2) {
    ctx.font = '8px monospace';
    ctx.fillStyle = '#334455';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NO TRAIL', w / 2, h / 2);
    return;
  }

  // Compute bounds
  const allPts = [...trail, [acLng, acLat] as [number, number]];
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of allPts) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  // Add some padding
  const dLng = (maxLng - minLng) || 0.01;
  const dLat = (maxLat - minLat) || 0.01;
  const pad = 0.15;
  minLng -= dLng * pad;
  maxLng += dLng * pad;
  minLat -= dLat * pad;
  maxLat += dLat * pad;

  const mapPad = 6;
  const mw = w - mapPad * 2;
  const mh = h - mapPad * 2;

  const toX = (lng: number) => mapPad + ((lng - minLng) / (maxLng - minLng)) * mw;
  const toY = (lat: number) => mapPad + ((maxLat - lat) / (maxLat - minLat)) * mh;

  // Draw trail with gradient fade
  for (let i = 1; i < trail.length; i++) {
    const alpha = (i / trail.length) * 0.8;
    ctx.beginPath();
    ctx.moveTo(toX(trail[i - 1][0]), toY(trail[i - 1][1]));
    ctx.lineTo(toX(trail[i][0]), toY(trail[i][1]));
    ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Line from last trail point to current position
  if (trail.length > 0) {
    const last = trail[trail.length - 1];
    ctx.beginPath();
    ctx.moveTo(toX(last[0]), toY(last[1]));
    ctx.lineTo(toX(acLng), toY(acLat));
    ctx.strokeStyle = '#00ff88cc';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Current position marker
  const px = toX(acLng);
  const py = toY(acLat);
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#00ff88';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.strokeStyle = '#00ff8866';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Trail start marker
  if (trail.length > 0) {
    const sx = toX(trail[0][0]);
    const sy = toY(trail[0][1]);
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff8844';
    ctx.fill();
  }

  // Label
  ctx.font = '7px monospace';
  ctx.fillStyle = '#556677';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TRAIL MAP', mapPad, 2);
  ctx.textAlign = 'right';
  ctx.fillText(`${trail.length} PTS`, w - mapPad, 2);
}

function drawTrendSparkline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: number[],
  color: string,
  label: string,
  unit: string,
) {
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1a2332';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(0, 0, w, h);

  const pad = 4;
  const labelH = 10;
  const chartH = h - labelH - pad * 2;
  const chartW = w - pad * 2;

  // Label
  ctx.font = '7px monospace';
  ctx.fillStyle = '#556677';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, pad, 2);

  if (data.length < 2) {
    ctx.fillStyle = '#334455';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('...', w / 2, h / 2);
    return;
  }

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  // Area fill
  ctx.beginPath();
  ctx.moveTo(pad, labelH + pad + chartH);
  for (let i = 0; i < data.length; i++) {
    const x = pad + (i / (data.length - 1)) * chartW;
    const y = labelH + pad + chartH - ((data[i] - minVal) / range) * chartH;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(pad + chartW, labelH + pad + chartH);
  ctx.closePath();
  ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
  ctx.fill();

  // Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = pad + (i / (data.length - 1)) * chartW;
    const y = labelH + pad + chartH - ((data[i] - minVal) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Current value
  const last = data[data.length - 1];
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`${Math.round(last).toLocaleString()} ${unit}`, w - pad, 1);
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
  const trailRef = useRef<HTMLCanvasElement>(null);
  const altTrendRef = useRef<HTMLCanvasElement>(null);
  const spdTrendRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const prevIcaoRef = useRef<string | null>(null);

  // Reset history when switching aircraft
  useEffect(() => {
    if (selectedAircraft !== prevIcaoRef.current) {
      historyRef.current = [];
      prevIcaoRef.current = selectedAircraft;
    }
  }, [selectedAircraft]);

  // Accumulate history while aircraft is selected
  useEffect(() => {
    if (!ac) return;
    const last = historyRef.current[historyRef.current.length - 1];
    // Only add if values changed or enough time elapsed
    if (!last || Date.now() - last.timestamp > 2000) {
      historyRef.current.push({
        altitude: ac.altitude,
        velocity: ac.velocity,
        timestamp: Date.now(),
      });
      // Keep last 60 entries
      if (historyRef.current.length > 60) {
        historyRef.current = historyRef.current.slice(-60);
      }
    }
  }, [ac]);

  const drawAll = useCallback(() => {
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

    // Trail mini-map
    if (trailRef.current) {
      const c = trailRef.current;
      const w = 120, h = 90;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      drawTrailMiniMap(ctx, w, h, ac.trail || [], ac.longitude, ac.latitude);
    }

    // Altitude trend sparkline
    if (altTrendRef.current) {
      const c = altTrendRef.current;
      const w = 120, h = 40;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      drawTrendSparkline(ctx, w, h, historyRef.current.map((e) => e.altitude), '#ffaa00', 'ALT TREND', 'ft');
    }

    // Speed trend sparkline
    if (spdTrendRef.current) {
      const c = spdTrendRef.current;
      const w = 120, h = 40;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      drawTrendSparkline(ctx, w, h, historyRef.current.map((e) => e.velocity), '#44ddff', 'SPD TREND', 'kt');
    }
  }, [ac]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  const vs = ac?.verticalRate ?? 0;
  const vsLabel = vs > 100 ? 'CLIMBING' : vs < -100 ? 'DESCENDING' : 'LEVEL';
  const vsColor = vs > 100 ? '#00ff88' : vs < -100 ? '#ff4444' : '#44ddff';

  // Compute time since last seen
  const lastSeenAgo = ac ? Math.round((Date.now() - ac.lastSeen) / 1000) : 0;

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
            <canvas ref={trailRef} className="gauge-canvas-trail" />
          </div>
          <div className="drawer-trends">
            <canvas ref={altTrendRef} className="trend-canvas" />
            <canvas ref={spdTrendRef} className="trend-canvas" />
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
            <div className="drawer-data-row">
              <span className="drawer-label">SEEN</span>
              <span className="drawer-value">{lastSeenAgo}s ago</span>
            </div>
            <div className="drawer-data-row">
              <span className="drawer-label">VS</span>
              <span className="drawer-value" style={{ color: vsColor }}>{vs > 0 ? '+' : ''}{Math.round(vs)} ft/m</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
