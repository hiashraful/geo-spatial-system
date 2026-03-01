import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useMapStore } from '../../store/useMapStore';

export function AlertsPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);
  const setSelectedAircraft = useMapStore((s) => s.setSelectedAircraft);
  const flyTo = useMapStore((s) => s.flyTo);
  const alertsMuted = useMapStore((s) => s.alertsMuted);
  const toggleAlertsMuted = useMapStore((s) => s.toggleAlertsMuted);
  const prevCount = useRef(0);

  // Flash on new alerts
  useEffect(() => {
    const handler = () => {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 1500);
    };
    window.addEventListener('geofence-alert-flash', handler);
    return () => window.removeEventListener('geofence-alert-flash', handler);
  }, []);

  // Also detect new alerts directly (for initial load race)
  useEffect(() => {
    if (geofenceAlerts.length > prevCount.current && prevCount.current > 0) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 1500);
    }
    prevCount.current = geofenceAlerts.length;
  }, [geofenceAlerts]);

  const handleAlertClick = (alert: typeof geofenceAlerts[0]) => {
    setSelectedAircraft(alert.aircraft.icao24);
    flyTo([alert.aircraft.longitude, alert.aircraft.latitude], 12);
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className={`alerts-panel ${flashing ? 'alert-flash' : ''}`}
    >
      <div className="panel-header alert-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="panel-title">
          ALERTS {geofenceAlerts.length > 0 && <span className="alert-badge">{geofenceAlerts.length}</span>}
        </span>
        <span className="alert-controls">
          <button
            className={`mute-btn ${alertsMuted ? 'muted' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleAlertsMuted();
            }}
            title={alertsMuted ? 'Unmute alerts' : 'Mute alerts'}
          >
            {alertsMuted ? 'MUTED' : 'SND'}
          </button>
          <span className="panel-toggle">{collapsed ? '+' : '-'}</span>
        </span>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="panel-body"
          >
            {geofenceAlerts.length === 0 ? (
              <div className="no-alerts">NO ACTIVE ALERTS</div>
            ) : (
              <div className="alerts-list">
                {geofenceAlerts.map((alert, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="alert-item"
                    onClick={() => handleAlertClick(alert)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="alert-icon">!</div>
                    <div className="alert-content">
                      <div className="alert-title">
                        GEOFENCE VIOLATION - {alert.aircraft.callsign}
                      </div>
                      <div className="alert-details">
                        {alert.violations.map((v) => (
                          <span key={v.id} className={`zone-tag ${v.zone_type}`}>
                            {v.name}
                          </span>
                        ))}
                      </div>
                      <div className="alert-meta">
                        ALT: {alert.aircraft.altitude.toLocaleString()} ft |
                        SQK: {alert.aircraft.squawk} |
                        HDG: {alert.aircraft.heading.toFixed(0)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
