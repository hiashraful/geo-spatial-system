import { motion } from 'framer-motion';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useState, useEffect } from 'react';

interface SystemStats {
  totalAircraft: number;
  averageAltitude: number;
  maxAltitude: number;
  minAltitude: number;
  wsClients: number;
  uptime: number;
  aiService: string;
  detectionCameras: number;
}

export function TopBar() {
  const wsConnected = useTelemetryStore((s) => s.wsConnected);
  const stats = useTelemetryStore((s) => s.stats);
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);
  const [sysStats, setSysStats] = useState<SystemStats | null>(null);

  // Poll system stats every 5s
  useEffect(() => {
    const fetchStats = () => {
      fetch('http://localhost:3001/api/stats')
        .then((r) => r.json())
        .then(setSysStats)
        .catch(() => {});
    };
    fetchStats();
    const iv = setInterval(fetchStats, 5000);
    return () => clearInterval(iv);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="top-bar"
    >
      <div className="top-bar-left">
        <div className="system-title">
          <span className="title-bracket">[</span>
          <span className="title-text">GEOINT</span>
          <span className="title-bracket">]</span>
          <span className="title-sub">TACTICAL INTELLIGENCE</span>
        </div>
      </div>

      <div className="top-bar-center">
        <div className="stat-item">
          <span className="stat-label">TRACKS</span>
          <span className="stat-value">{stats.totalAircraft}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">AVG ALT</span>
          <span className="stat-value">{stats.averageAltitude.toLocaleString()} ft</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">DETECTIONS</span>
          <span className="stat-value">{stats.totalDetections}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">CAMERAS</span>
          <span className="stat-value">{sysStats?.detectionCameras ?? '--'}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">ALERTS</span>
          <span className={`stat-value ${geofenceAlerts.length > 0 ? 'status-warning' : ''}`}>
            {geofenceAlerts.length}
          </span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">UPLINK</span>
          <span className={`stat-value ${wsConnected ? 'status-ok' : 'status-error'}`}>
            {wsConnected ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">AI SVC</span>
          <span className={`stat-value ${sysStats?.aiService === 'online' ? 'status-ok' : 'status-error'}`}>
            {sysStats?.aiService === 'online' ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="top-bar-right">
        <div className="system-uptime">
          <span className="uptime-label">UPTIME</span>
          <span className="uptime-value">{sysStats ? formatUptime(sysStats.uptime) : '--:--:--'}</span>
        </div>
        <div className="clock">
          <ClockDisplay />
        </div>
      </div>
    </motion.div>
  );
}

function ClockDisplay() {
  const now = new Date();
  const utc = now.toISOString().substring(11, 19);
  const date = now.toISOString().substring(0, 10);

  return (
    <div className="clock-display">
      <span className="clock-time">{utc}Z</span>
      <span className="clock-date">{date}</span>
    </div>
  );
}
