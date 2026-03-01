import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useEffect, useState, useRef } from 'react';

function formatDMS(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d - m / 60) * 3600).toFixed(1);
  return `${d}°${m.toString().padStart(2, '0')}'${s.padStart(4, '0')}"${dir}`;
}

export function StatusBar() {
  const wsConnected = useTelemetryStore((s) => s.wsConnected);
  const lastUpdate = useTelemetryStore((s) => s.lastUpdate);
  const stats = useTelemetryStore((s) => s.stats);
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);
  const [elapsed, setElapsed] = useState(0);
  const [cursorCoords, setCursorCoords] = useState('--');
  const frameCount = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      if (lastUpdate > 0) {
        setElapsed(Math.round((Date.now() - lastUpdate) / 1000));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [lastUpdate]);

  useEffect(() => {
    const handler = (e: CustomEvent<{ lat: number; lng: number }>) => {
      // Throttle to every 3rd event for DMS formatting
      frameCount.current++;
      if (frameCount.current % 3 !== 0) return;
      const { lat, lng } = e.detail;
      setCursorCoords(`${formatDMS(lat, true)} ${formatDMS(lng, false)}`);
    };
    window.addEventListener('map-mousemove' as any, handler);
    return () => window.removeEventListener('map-mousemove' as any, handler);
  }, []);

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {wsConnected ? 'LINK ESTABLISHED' : 'LINK DOWN - RECONNECTING'}
        </span>
      </div>
      <div className="status-center">
        <span className="status-item">REFRESH: {elapsed}s AGO</span>
        <span className="status-sep">|</span>
        <span className="status-item">TRACKS: {stats.totalAircraft}</span>
        <span className="status-sep">|</span>
        <span className="status-item">DET: {stats.totalDetections}</span>
        <span className="status-sep">|</span>
        <span className="status-item cursor-coords">{cursorCoords}</span>
        <span className="status-sep">|</span>
        <span className="status-item">WGS84</span>
        {geofenceAlerts.length > 0 && (
          <>
            <span className="status-sep">|</span>
            <span className="status-item status-alert-badge">BREACH: {geofenceAlerts.length}</span>
          </>
        )}
      </div>
      <div className="status-right">
        <span className="status-item">SYS OPERATIONAL</span>
      </div>
    </div>
  );
}
