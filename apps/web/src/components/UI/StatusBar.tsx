import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useEffect, useState } from 'react';

export function StatusBar() {
  const wsConnected = useTelemetryStore((s) => s.wsConnected);
  const lastUpdate = useTelemetryStore((s) => s.lastUpdate);
  const stats = useTelemetryStore((s) => s.stats);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      if (lastUpdate > 0) {
        setElapsed(Math.round((Date.now() - lastUpdate) / 1000));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [lastUpdate]);

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
        <span className="status-item">ACTIVE TRACKS: {stats.totalAircraft}</span>
        <span className="status-sep">|</span>
        <span className="status-item">COORD: EPSG:4326</span>
      </div>
      <div className="status-right">
        <span className="status-item">SYS OPERATIONAL</span>
      </div>
    </div>
  );
}
