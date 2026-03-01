import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useMapStore } from '../../store/useMapStore';

export function AlertsPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);
  const setSelectedAircraft = useMapStore((s) => s.setSelectedAircraft);
  const flyTo = useMapStore((s) => s.flyTo);

  const handleAlertClick = (alert: typeof geofenceAlerts[0]) => {
    setSelectedAircraft(alert.aircraft.icao24);
    flyTo([alert.aircraft.longitude, alert.aircraft.latitude], 12);
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="alerts-panel"
    >
      <div className="panel-header alert-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="panel-title">
          ALERTS {geofenceAlerts.length > 0 && <span className="alert-badge">{geofenceAlerts.length}</span>}
        </span>
        <span className="panel-toggle">{collapsed ? '+' : '-'}</span>
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
