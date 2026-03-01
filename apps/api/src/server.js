import Fastify from 'fastify';
import cors from '@fastify/cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { config } from './config.js';
import { query, getGeofenceZones, getTrafficCameras, checkGeofenceViolations } from './db.js';
import { setAircraftState, removeStaleAircraft } from './redis-client.js';
import { TelemetrySimulator } from './telemetry-simulator.js';
import { DetectionSimulator } from './detection-simulator.js';

// ---- Create HTTP server shared between Fastify and WS ----
const httpServer = http.createServer();

const app = Fastify({ logger: false, serverFactory: (handler) => {
  httpServer.on('request', handler);
  return httpServer;
}});

await app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// ---- WebSocket Server (on same HTTP server, /ws path) ----
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const wsClients = new Set();

const telemetrySimulator = new TelemetrySimulator(config.telemetry.maxAircraft);
const detectionSimulator = new DetectionSimulator();

let lastBroadcast = 0;
let pendingBroadcast = null;

function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const client of wsClients) {
    if (client.readyState === 1) {
      try {
        client.send(message);
      } catch {
        wsClients.delete(client);
      }
    }
  }
}

function throttledBroadcast(type, data) {
  const now = Date.now();
  if (now - lastBroadcast >= config.telemetry.broadcastIntervalMs) {
    broadcast(type, data);
    lastBroadcast = now;
    pendingBroadcast = null;
  } else if (!pendingBroadcast) {
    pendingBroadcast = setTimeout(() => {
      broadcast(type, data);
      lastBroadcast = Date.now();
      pendingBroadcast = null;
    }, config.telemetry.broadcastIntervalMs - (now - lastBroadcast));
  }
}

// ---- WebSocket Handler ----
wss.on('connection', (socket) => {
  console.log('[WS] Client connected');
  wsClients.add(socket);

  // Send initial state
  const allAircraft = telemetrySimulator.getAll();
  socket.send(JSON.stringify({
    type: 'init',
    data: { aircraft: allAircraft, count: allAircraft.length },
    timestamp: Date.now(),
  }));

  socket.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      handleClientMessage(socket, parsed);
    } catch {
      // ignore
    }
  });

  socket.on('close', () => {
    wsClients.delete(socket);
    console.log('[WS] Client disconnected');
  });

  socket.on('error', () => {
    wsClients.delete(socket);
  });
});

function handleClientMessage(socket, msg) {
  switch (msg.type) {
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    case 'get_aircraft':
      socket.send(JSON.stringify({
        type: 'aircraft_snapshot',
        data: telemetrySimulator.getAll(),
        timestamp: Date.now(),
      }));
      break;
  }
}

// ---- REST Routes ----
app.get('/api/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
  aircraft: telemetrySimulator.getCount(),
  wsClients: wsClients.size,
  timestamp: Date.now(),
}));

app.get('/api/geofences', async () => {
  try {
    const zones = await getGeofenceZones();
    return { type: 'FeatureCollection', features: zones };
  } catch (err) {
    console.error('[API] Geofence fetch error:', err.message);
    return { type: 'FeatureCollection', features: [] };
  }
});

app.get('/api/cameras', async () => {
  try {
    const cameras = await getTrafficCameras();
    return { cameras };
  } catch (err) {
    console.error('[API] Camera fetch error:', err.message);
    return { cameras: [] };
  }
});

app.get('/api/aircraft', async () => ({
  aircraft: telemetrySimulator.getAll(),
  count: telemetrySimulator.getCount(),
  timestamp: Date.now(),
}));

app.get('/api/stats', async () => {
  const allAircraft = telemetrySimulator.getAll();
  const altitudes = allAircraft.map(ac => ac.altitude);
  const avgAlt = altitudes.length > 0
    ? Math.round(altitudes.reduce((a, b) => a + b, 0) / altitudes.length)
    : 0;

  return {
    totalAircraft: allAircraft.length,
    averageAltitude: avgAlt,
    maxAltitude: Math.max(0, ...altitudes),
    minAltitude: Math.min(Infinity, ...altitudes.filter(a => a > 0)),
    wsClients: wsClients.size,
    uptime: Math.round(process.uptime()),
  };
});

// ---- Telemetry Pipeline ----
telemetrySimulator.onUpdate(async (updates) => {
  // Update Redis cache (fire-and-forget)
  for (const ac of updates) {
    setAircraftState(ac.icao24, ac).catch(() => {});
  }

  // Broadcast to WebSocket clients
  throttledBroadcast('telemetry', {
    aircraft: updates,
    count: updates.length,
  });

  // Check geofence violations (sample)
  for (const ac of updates.slice(0, 3)) {
    try {
      const violations = await checkGeofenceViolations(ac.latitude, ac.longitude, ac.altitude);
      if (violations.length > 0) {
        broadcast('geofence_alert', { aircraft: ac, violations });
      }
    } catch {}
  }
});

// ---- Detection Pipeline ----
detectionSimulator.onDetection((payload) => {
  broadcast('detections', payload);
});

// ---- Startup ----
async function start() {
  try {
    // Wait for DB
    let dbReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        await query('SELECT 1');
        dbReady = true;
        break;
      } catch {
        console.log(`[DB] Waiting for database... (attempt ${i + 1})`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!dbReady) {
      console.error('[DB] Could not connect to database, starting without DB features');
    } else {
      console.log('[DB] Connected to PostgreSQL/PostGIS');
      try {
        const cameras = await getTrafficCameras();
        detectionSimulator.setCameras(cameras);
        console.log(`[Detection] Loaded ${cameras.length} traffic cameras`);
      } catch (err) {
        console.error('[Detection] Could not load cameras:', err.message);
      }
    }

    telemetrySimulator.start();
    detectionSimulator.start();

    // Stale aircraft cleanup
    setInterval(async () => {
      try {
        const removed = await removeStaleAircraft(config.telemetry.staleTimeoutMs);
        if (removed.length > 0) {
          broadcast('aircraft_removed', { icao24s: removed });
        }
      } catch {}
    }, 30000);

    await app.listen({ port: config.port, host: config.host });
    console.log(`[API] Server running on http://localhost:${config.port}`);
    console.log(`[WS] WebSocket available at ws://localhost:${config.port}/ws`);
  } catch (err) {
    console.error('[API] Fatal error:', err);
    process.exit(1);
  }
}

start();
