/**
 * Aircraft Telemetry Simulator
 * Generates realistic ADS-B-like flight data for aircraft in the NYC metro area.
 * Each aircraft follows a realistic flight path with heading, altitude transitions,
 * and velocity patterns.
 */

const NYC_CENTER = { lat: 40.7128, lon: -74.0060 };
const AREA_RADIUS = 0.8; // ~80km radius in degrees

const AIRLINES = [
  'AAL', 'UAL', 'DAL', 'SWA', 'JBU', 'ASA', 'FFT', 'NKS', 'SKW', 'RPA',
  'BAW', 'DLH', 'AFR', 'KLM', 'UAE', 'SIA', 'ANA', 'JAL', 'QFA', 'EIN',
];

const SQUAWK_CODES = ['1200', '7500', '7600', '7700', '2000', '3421', '5765', '4312'];

function randomHex(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateCallsign() {
  const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
  const number = Math.floor(Math.random() * 9000) + 100;
  return `${airline}${number}`;
}

function generateICAO24() {
  return randomHex(6);
}

// Flight path types
const FLIGHT_TYPES = ['arrival', 'departure', 'overflight', 'circling', 'holding'];

function createAircraft() {
  const type = FLIGHT_TYPES[Math.floor(Math.random() * FLIGHT_TYPES.length)];
  const icao24 = generateICAO24();
  const callsign = generateCallsign();

  let lat, lon, altitude, heading, velocity, verticalRate;
  const angle = Math.random() * Math.PI * 2;

  switch (type) {
    case 'arrival':
      // Start from edge, heading toward airports
      lat = NYC_CENTER.lat + Math.cos(angle) * AREA_RADIUS;
      lon = NYC_CENTER.lon + Math.sin(angle) * AREA_RADIUS;
      altitude = 15000 + Math.random() * 20000;
      heading = (Math.atan2(NYC_CENTER.lon - lon, NYC_CENTER.lat - lat) * 180 / Math.PI + 360) % 360;
      velocity = 200 + Math.random() * 100;
      verticalRate = -(500 + Math.random() * 1500);
      break;

    case 'departure':
      // Start near airports, climbing
      lat = NYC_CENTER.lat + (Math.random() - 0.5) * 0.15;
      lon = NYC_CENTER.lon + (Math.random() - 0.5) * 0.15;
      altitude = 1000 + Math.random() * 5000;
      heading = Math.random() * 360;
      velocity = 150 + Math.random() * 100;
      verticalRate = 1000 + Math.random() * 2000;
      break;

    case 'overflight':
      // High altitude, crossing the area
      lat = NYC_CENTER.lat + (Math.random() - 0.5) * AREA_RADIUS * 1.5;
      lon = NYC_CENTER.lon + (Math.random() - 0.5) * AREA_RADIUS * 1.5;
      altitude = 30000 + Math.random() * 11000;
      heading = Math.random() * 360;
      velocity = 400 + Math.random() * 150;
      verticalRate = (Math.random() - 0.5) * 200;
      break;

    case 'circling':
      // Near an airport, circling pattern
      lat = NYC_CENTER.lat + (Math.random() - 0.5) * 0.2;
      lon = NYC_CENTER.lon + (Math.random() - 0.5) * 0.2;
      altitude = 3000 + Math.random() * 5000;
      heading = Math.random() * 360;
      velocity = 150 + Math.random() * 50;
      verticalRate = (Math.random() - 0.5) * 500;
      break;

    case 'holding':
      // Holding pattern
      lat = NYC_CENTER.lat + (Math.random() - 0.5) * 0.3;
      lon = NYC_CENTER.lon + (Math.random() - 0.5) * 0.3;
      altitude = 8000 + Math.random() * 7000;
      heading = Math.random() * 360;
      velocity = 180 + Math.random() * 40;
      verticalRate = 0;
      break;
  }

  return {
    icao24,
    callsign,
    latitude: lat,
    longitude: lon,
    altitude,
    heading,
    velocity,
    verticalRate,
    onGround: false,
    squawk: Math.random() > 0.95 ? SQUAWK_CODES[Math.floor(Math.random() * SQUAWK_CODES.length)] : '1200',
    category: 'A' + Math.floor(Math.random() * 5),
    flightType: type,
    turnRate: (Math.random() - 0.5) * 2, // degrees per update
    lastSeen: Date.now(),
    trail: [],
  };
}

function updateAircraft(aircraft) {
  const dt = 1; // 1 second step

  // Heading change
  if (aircraft.flightType === 'circling') {
    aircraft.heading = (aircraft.heading + 1.5 + Math.random() * 0.5) % 360;
  } else if (aircraft.flightType === 'holding') {
    aircraft.heading = (aircraft.heading + 2.0) % 360;
  } else {
    aircraft.heading = (aircraft.heading + aircraft.turnRate + (Math.random() - 0.5) * 0.3 + 360) % 360;
  }

  // Position update based on velocity and heading
  const headingRad = (aircraft.heading * Math.PI) / 180;
  const speedDegPerSec = (aircraft.velocity * 0.000277778) / 111.32; // knots to deg/s approx

  aircraft.latitude += Math.cos(headingRad) * speedDegPerSec * dt;
  aircraft.longitude += Math.sin(headingRad) * speedDegPerSec * dt / Math.cos(aircraft.latitude * Math.PI / 180);

  // Altitude change
  aircraft.altitude += aircraft.verticalRate * dt / 60;

  // Clamp altitude
  if (aircraft.altitude < 0) {
    aircraft.altitude = 0;
    aircraft.onGround = true;
    aircraft.velocity = Math.max(0, aircraft.velocity - 5);
    aircraft.verticalRate = 0;
  }
  if (aircraft.altitude > 45000) {
    aircraft.altitude = 45000;
    aircraft.verticalRate = Math.min(0, aircraft.verticalRate);
  }

  // Gradual vertical rate changes
  if (aircraft.flightType === 'arrival' && aircraft.altitude > 2000) {
    aircraft.verticalRate = Math.max(aircraft.verticalRate, -2000);
    if (aircraft.altitude < 5000) {
      aircraft.velocity = Math.max(130, aircraft.velocity - 0.5);
    }
  } else if (aircraft.flightType === 'departure' && aircraft.altitude < 35000) {
    aircraft.verticalRate = Math.max(500, aircraft.verticalRate - 2);
    if (aircraft.altitude > 10000) {
      aircraft.velocity = Math.min(480, aircraft.velocity + 0.3);
    }
  }

  // Add velocity jitter
  aircraft.velocity += (Math.random() - 0.5) * 2;
  aircraft.velocity = Math.max(0, Math.min(600, aircraft.velocity));

  // Trail (keep last 20 positions)
  aircraft.trail.push({
    lat: aircraft.latitude,
    lon: aircraft.longitude,
    alt: aircraft.altitude,
    ts: Date.now(),
  });
  if (aircraft.trail.length > 20) {
    aircraft.trail.shift();
  }

  aircraft.lastSeen = Date.now();

  return aircraft;
}

function isOutOfBounds(aircraft) {
  const dLat = Math.abs(aircraft.latitude - NYC_CENTER.lat);
  const dLon = Math.abs(aircraft.longitude - NYC_CENTER.lon);
  return dLat > AREA_RADIUS * 1.5 || dLon > AREA_RADIUS * 1.5 || aircraft.onGround;
}

export class TelemetrySimulator {
  constructor(maxAircraft = 35) {
    this.maxAircraft = maxAircraft;
    this.aircraft = new Map();
    this.running = false;
    this.intervalId = null;
    this.listeners = [];
  }

  onUpdate(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  start() {
    if (this.running) return;
    this.running = true;

    // Initialize aircraft
    for (let i = 0; i < this.maxAircraft; i++) {
      const ac = createAircraft();
      this.aircraft.set(ac.icao24, ac);
    }

    console.log(`[Telemetry] Simulator started with ${this.aircraft.size} aircraft`);

    this.intervalId = setInterval(() => this._tick(), 1000);
  }

  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  _tick() {
    const updates = [];

    for (const [icao24, ac] of this.aircraft) {
      updateAircraft(ac);

      if (isOutOfBounds(ac)) {
        this.aircraft.delete(icao24);
        // Replace with new aircraft
        const newAc = createAircraft();
        this.aircraft.set(newAc.icao24, newAc);
        updates.push(this._toTelemetry(newAc));
      } else {
        updates.push(this._toTelemetry(ac));
      }
    }

    // Ensure we maintain target count
    while (this.aircraft.size < this.maxAircraft) {
      const ac = createAircraft();
      this.aircraft.set(ac.icao24, ac);
      updates.push(this._toTelemetry(ac));
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(updates);
      } catch (err) {
        console.error('[Telemetry] Listener error:', err.message);
      }
    }
  }

  _toTelemetry(ac) {
    return {
      icao24: ac.icao24,
      callsign: ac.callsign,
      latitude: Math.round(ac.latitude * 1e6) / 1e6,
      longitude: Math.round(ac.longitude * 1e6) / 1e6,
      altitude: Math.round(ac.altitude),
      heading: Math.round(ac.heading * 10) / 10,
      velocity: Math.round(ac.velocity),
      verticalRate: Math.round(ac.verticalRate),
      onGround: ac.onGround,
      squawk: ac.squawk,
      category: ac.category,
      lastSeen: ac.lastSeen,
      trail: ac.trail.map(t => [t.lat, t.lon]),
    };
  }

  getAll() {
    return Array.from(this.aircraft.values()).map(ac => this._toTelemetry(ac));
  }

  getCount() {
    return this.aircraft.size;
  }
}
