import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useEffect, useState } from 'react';

export function StatusBar() {
  const wsConnected = useTelemetryStore((s) => s.wsConnected);
  const lastUpdate = useTelemetryStore((s) => s.lastUpdate);
  const stats = useTelemetryStore((s) => s.stats);
  const [elapsed, setElapsed] = useState(0);
  const [cursorCoords, setCursorCoords] = useState('--');

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
      const { lat, lng } = e.detail;
      const latDir = lat >= 0 ? 'N' : 'S';
      const lngDir = lng >= 0 ? 'E' : 'W';
      setCursorCoords(`${Math.abs(lat).toFixed(4)}${latDir} ${Math.abs(lng).toFixed(4)}${lngDir}`);
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
        <span className="status-item cursor-coords">{cursorCoords}</span>
        <span className="status-sep">|</span>
        <span className="status-item">EPSG:4326</span>
      </div>
      <div className="status-right">
        <span className="status-item">SYS OPERATIONAL</span>
      </div>
    </div>
  );
}
