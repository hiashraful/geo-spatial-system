import { motion } from 'framer-motion';
import { useTelemetryStore } from '../../store/useTelemetryStore';

export function TopBar() {
  const wsConnected = useTelemetryStore((s) => s.wsConnected);
  const stats = useTelemetryStore((s) => s.stats);
  const lastUpdate = useTelemetryStore((s) => s.lastUpdate);

  const timeSinceUpdate = lastUpdate > 0
    ? Math.round((Date.now() - lastUpdate) / 1000)
    : '--';

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
          <span className="stat-label">UPLINK</span>
          <span className={`stat-value ${wsConnected ? 'status-ok' : 'status-error'}`}>
            {wsConnected ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="top-bar-right">
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
