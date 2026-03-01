import { useState } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportGeoJSON() {
  const aircraft = useTelemetryStore.getState().aircraft;
  const features = Array.from(aircraft.values()).map((ac) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [ac.longitude, ac.latitude, ac.altitude * 0.3048], // ft to meters
    },
    properties: {
      icao24: ac.icao24,
      callsign: ac.callsign,
      altitude_ft: ac.altitude,
      heading: ac.heading,
      velocity_kts: ac.velocity,
      verticalRate: ac.verticalRate,
      squawk: ac.squawk,
      onGround: ac.onGround,
      category: ac.category,
      lastSeen: new Date(ac.lastSeen).toISOString(),
    },
  }));

  const geojson = {
    type: 'FeatureCollection',
    features,
    properties: {
      exportedAt: new Date().toISOString(),
      totalAircraft: features.length,
      source: 'GEOINT Tactical Intelligence Dashboard',
    },
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadJSON(geojson, `geoint-aircraft-${ts}.geojson`);
}

function exportTracks() {
  const aircraft = useTelemetryStore.getState().aircraft;
  const features = Array.from(aircraft.values())
    .filter((ac) => ac.trail.length >= 2)
    .map((ac) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: ac.trail.map((pt) => [pt[0], pt[1]]),
      },
      properties: {
        icao24: ac.icao24,
        callsign: ac.callsign,
        altitude_ft: ac.altitude,
        trailPoints: ac.trail.length,
      },
    }));

  const geojson = {
    type: 'FeatureCollection',
    features,
    properties: {
      exportedAt: new Date().toISOString(),
      totalTracks: features.length,
      source: 'GEOINT Tactical Intelligence Dashboard',
    },
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadJSON(geojson, `geoint-tracks-${ts}.geojson`);
}

function exportAlerts() {
  const alerts = useTelemetryStore.getState().geofenceAlerts;
  const data = {
    exportedAt: new Date().toISOString(),
    totalAlerts: alerts.length,
    source: 'GEOINT Tactical Intelligence Dashboard',
    alerts: alerts.map((a) => ({
      aircraft: {
        icao24: a.aircraft.icao24,
        callsign: a.aircraft.callsign,
        altitude: a.aircraft.altitude,
        position: [a.aircraft.longitude, a.aircraft.latitude],
      },
      violations: a.violations,
    })),
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadJSON(data, `geoint-alerts-${ts}.json`);
}

export function DataExport() {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="data-export" onMouseLeave={() => setShowMenu(false)}>
      <button
        className="export-btn"
        onClick={() => setShowMenu(!showMenu)}
      >
        EXPORT
      </button>
      {showMenu && (
        <div className="export-menu">
          <button className="export-menu-item" onClick={() => { exportGeoJSON(); setShowMenu(false); }}>
            Aircraft (GeoJSON)
          </button>
          <button className="export-menu-item" onClick={() => { exportTracks(); setShowMenu(false); }}>
            Tracks (GeoJSON)
          </button>
          <button className="export-menu-item" onClick={() => { exportAlerts(); setShowMenu(false); }}>
            Alerts (JSON)
          </button>
        </div>
      )}
    </div>
  );
}
