import { useMemo } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

const LEVELS = [
  { name: 'LOW', color: '#00ff88', threshold: 0 },
  { name: 'GUARDED', color: '#44ddff', threshold: 1 },
  { name: 'ELEVATED', color: '#ffaa00', threshold: 3 },
  { name: 'HIGH', color: '#ff6644', threshold: 5 },
  { name: 'CRITICAL', color: '#ff0000', threshold: 8 },
];

export function ThreatLevel() {
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);
  const aircraft = useTelemetryStore((s) => s.aircraft);
  const detections = useTelemetryStore((s) => s.detections);

  const { level, score } = useMemo(() => {
    let s = 0;

    // Geofence breaches: +2 each
    s += geofenceAlerts.length * 2;

    // Emergency squawks: +3 each
    for (const ac of aircraft.values()) {
      if (ac.squawk === '7700' || ac.squawk === '7600' || ac.squawk === '7500') {
        s += 3;
      }
    }

    // Suspicious detections: +1 each
    for (const det of detections) {
      if (det.className.toLowerCase().includes('suspicious')) {
        s += 1;
      }
    }

    let lvl = LEVELS[0];
    for (const l of LEVELS) {
      if (s >= l.threshold) lvl = l;
    }

    return { level: lvl, score: s };
  }, [geofenceAlerts, aircraft, detections]);

  return (
    <div className="threat-level" style={{ borderColor: level.color + '44' }}>
      <div className="threat-header">
        <span className="threat-label">THREAT</span>
        <span className="threat-score" style={{ color: level.color }}>{score}</span>
      </div>
      <div className="threat-bars">
        {LEVELS.map((l, i) => (
          <div
            key={l.name}
            className="threat-bar-segment"
            style={{
              background: score >= l.threshold ? l.color : '#1a2332',
              opacity: score >= l.threshold ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      <div className="threat-name" style={{ color: level.color }}>
        {level.name}
      </div>
    </div>
  );
}
