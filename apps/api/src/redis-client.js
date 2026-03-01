import Redis from 'ioredis';
import { config } from './config.js';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error', (err) => console.error('[Redis] Error:', err.message));

// Aircraft state cache keyed by icao24
const AIRCRAFT_KEY = 'aircraft:state';
const AIRCRAFT_TTL = 120; // 2 minutes

export async function setAircraftState(icao24, state) {
  await redis.hset(AIRCRAFT_KEY, icao24, JSON.stringify(state));
  await redis.expire(AIRCRAFT_KEY, AIRCRAFT_TTL);
}

export async function getAircraftState(icao24) {
  const data = await redis.hget(AIRCRAFT_KEY, icao24);
  return data ? JSON.parse(data) : null;
}

export async function getAllAircraftStates() {
  const data = await redis.hgetall(AIRCRAFT_KEY);
  const states = {};
  for (const [key, val] of Object.entries(data)) {
    try {
      states[key] = JSON.parse(val);
    } catch {
      // skip malformed entries
    }
  }
  return states;
}

export async function removeStaleAircraft(staleTimeoutMs) {
  const all = await getAllAircraftStates();
  const now = Date.now();
  const removed = [];
  for (const [icao24, state] of Object.entries(all)) {
    if (now - state.lastSeen > staleTimeoutMs) {
      await redis.hdel(AIRCRAFT_KEY, icao24);
      removed.push(icao24);
    }
  }
  return removed;
}

export async function publishEvent(channel, data) {
  await redis.publish(channel, JSON.stringify(data));
}

export { redis };
