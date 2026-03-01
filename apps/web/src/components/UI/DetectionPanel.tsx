import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

const CLASS_COLORS: Record<string, string> = {
  vehicle: '#44aaff',
  person: '#ffaa00',
  truck: '#ff6644',
  bus: '#aa44ff',
  bicycle: '#44ff88',
  motorcycle: '#ff44aa',
  emergency_vehicle: '#ff0000',
  suspicious_package: '#ff0000',
};

export function DetectionPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const detectionSummary = useTelemetryStore((s) => s.detectionSummary);
  const detections = useTelemetryStore((s) => s.detections);

  // Aggregate totals by class
  const classTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const cameraData of Object.values(detectionSummary)) {
      for (const [cls, count] of Object.entries(cameraData)) {
        totals[cls] = (totals[cls] || 0) + count;
      }
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [detectionSummary]);

  return (
    <motion.div
      initial={{ y: 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="detection-panel"
    >
      <div className="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="panel-title">AI DETECTIONS</span>
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
            {/* Class summary bars */}
            <div className="detection-summary">
              {classTotals.map(([cls, count]) => {
                const maxCount = classTotals[0]?.[1] || 1;
                const pct = (count / (maxCount as number)) * 100;
                return (
                  <div key={cls} className="detection-bar-row">
                    <span className="detection-class" style={{ color: CLASS_COLORS[cls] || '#fff' }}>
                      {cls.replace('_', ' ').toUpperCase()}
                    </span>
                    <div className="detection-bar-bg">
                      <motion.div
                        className="detection-bar-fill"
                        style={{ backgroundColor: CLASS_COLORS[cls] || '#fff' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="detection-count">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Camera feed summary */}
            <div className="camera-detections">
              {Object.entries(detectionSummary).slice(0, 5).map(([cameraId, classes]) => {
                const total = Object.values(classes).reduce((a, b) => a + b, 0);
                return (
                  <div key={cameraId} className="camera-det-row">
                    <span className="camera-id">{cameraId}</span>
                    <span className="camera-det-count">{total} objects</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
