export const config = {
  port: parseInt(process.env.API_PORT || '3001'),
  host: process.env.API_HOST || '0.0.0.0',

  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5435'),
    database: process.env.PG_DB || 'geospatial',
    user: process.env.PG_USER || 'geouser',
    password: process.env.PG_PASS || 'geopass123',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6381'),
  },

  telemetry: {
    broadcastIntervalMs: 1000,
    maxAircraft: 50,
    staleTimeoutMs: 60000,
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8500',
  },
};
