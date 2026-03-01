import pg from 'pg';
import { config } from './config.js';

const pool = new pg.Pool(config.postgres);

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 100) {
    console.log(`[DB] Slow query (${duration}ms): ${text.substring(0, 80)}`);
  }
  return res;
}

export async function getGeofenceZones() {
  const res = await query(`
    SELECT id, name, zone_type, altitude_min, altitude_max, active,
           ST_AsGeoJSON(geom)::json as geometry
    FROM geofence_zones WHERE active = true
  `);
  return res.rows.map(row => ({
    type: 'Feature',
    properties: {
      id: row.id,
      name: row.name,
      zoneType: row.zone_type,
      altitudeMin: row.altitude_min,
      altitudeMax: row.altitude_max,
    },
    geometry: row.geometry,
  }));
}

export async function getTrafficCameras() {
  const res = await query(`
    SELECT camera_id, name, latitude, longitude, status, stream_url, metadata
    FROM traffic_cameras ORDER BY name
  `);
  return res.rows;
}

export async function insertAircraftPosition(aircraft) {
  await query(`
    INSERT INTO aircraft_positions (icao24, callsign, latitude, longitude, altitude, heading, velocity, vertical_rate, on_ground, squawk)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    aircraft.icao24, aircraft.callsign, aircraft.latitude, aircraft.longitude,
    aircraft.altitude, aircraft.heading, aircraft.velocity, aircraft.verticalRate,
    aircraft.onGround, aircraft.squawk,
  ]);
}

export async function getAircraftInBounds(bbox) {
  const res = await query(`
    SELECT DISTINCT ON (icao24) icao24, callsign, latitude, longitude, altitude,
           heading, velocity, vertical_rate, on_ground, squawk, timestamp
    FROM aircraft_positions
    WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      AND timestamp > NOW() - INTERVAL '2 minutes'
    ORDER BY icao24, timestamp DESC
  `, [bbox.west, bbox.south, bbox.east, bbox.north]);
  return res.rows;
}

export async function checkGeofenceViolations(lat, lon, altitude) {
  const res = await query(`
    SELECT id, name, zone_type
    FROM geofence_zones
    WHERE active = true
      AND ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      AND $3 BETWEEN altitude_min AND altitude_max
  `, [lon, lat, altitude || 0]);
  return res.rows;
}

export async function saveDetectionResult(detection) {
  await query(`
    INSERT INTO detection_results (source_type, source_id, class_name, confidence, bbox_geojson, latitude, longitude, geom, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326), $10)
  `, [
    detection.sourceType, detection.sourceId, detection.className,
    detection.confidence, JSON.stringify(detection.bbox), detection.latitude,
    detection.longitude, detection.longitude, detection.latitude,
    JSON.stringify(detection.metadata || {}),
  ]);
}

export { pool };
