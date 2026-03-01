import { create } from 'zustand';

export interface AircraftData {
  icao24: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  velocity: number;
  verticalRate: number;
  onGround: boolean;
  squawk: string;
  category: string;
  lastSeen: number;
  trail: [number, number][];
}

export interface Detection {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  className: string;
  confidence: number;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface DetectionPayload {
  detections: Detection[];
  summary: Record<string, Record<string, number>>;
  timestamp: number;
}

export interface GeofenceAlert {
  aircraft: AircraftData;
  violations: { id: number; name: string; zone_type: string }[];
}

export interface HistoryPoint {
  timestamp: number;
  tracks: number;
  detections: number;
  alerts: number;
}

interface TelemetryState {
  aircraft: Map<string, AircraftData>;
  detections: Detection[];
  detectionSummary: Record<string, Record<string, number>>;
  geofenceAlerts: GeofenceAlert[];
  wsConnected: boolean;
  lastUpdate: number;
  history: HistoryPoint[];
  stats: {
    totalAircraft: number;
    averageAltitude: number;
    totalDetections: number;
  };
  wsLatency: number;
  msgRate: number;
  updateAircraft: (data: AircraftData[]) => void;
  updateDetections: (payload: DetectionPayload) => void;
  addGeofenceAlert: (alert: GeofenceAlert) => void;
  setWsConnected: (connected: boolean) => void;
  setWsLatency: (ms: number) => void;
  setMsgRate: (rate: number) => void;
  getAircraftArray: () => AircraftData[];
  pushHistory: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  aircraft: new Map(),
  detections: [],
  detectionSummary: {},
  geofenceAlerts: [],
  wsConnected: false,
  lastUpdate: 0,
  history: [],
  wsLatency: 0,
  msgRate: 0,
  stats: {
    totalAircraft: 0,
    averageAltitude: 0,
    totalDetections: 0,
  },

  updateAircraft: (data) =>
    set((state) => {
      const newMap = new Map(state.aircraft);
      for (const ac of data) {
        newMap.set(ac.icao24, ac);
      }

      // Compute stats
      const all = Array.from(newMap.values());
      const altitudes = all.map((a) => a.altitude).filter((a) => a > 0);
      const avgAlt =
        altitudes.length > 0
          ? Math.round(altitudes.reduce((a, b) => a + b, 0) / altitudes.length)
          : 0;

      return {
        aircraft: newMap,
        lastUpdate: Date.now(),
        stats: {
          ...state.stats,
          totalAircraft: newMap.size,
          averageAltitude: avgAlt,
        },
      };
    }),

  updateDetections: (payload) =>
    set((state) => ({
      detections: payload.detections.slice(0, 100), // keep last 100
      detectionSummary: payload.summary,
      stats: {
        ...state.stats,
        totalDetections: payload.detections.length,
      },
    })),

  addGeofenceAlert: (alert) =>
    set((state) => ({
      geofenceAlerts: [alert, ...state.geofenceAlerts].slice(0, 20),
    })),

  setWsConnected: (connected) => set({ wsConnected: connected }),
  setWsLatency: (ms) => set({ wsLatency: ms }),
  setMsgRate: (rate) => set({ msgRate: rate }),

  getAircraftArray: () => Array.from(get().aircraft.values()),

  pushHistory: () =>
    set((state) => {
      const point: HistoryPoint = {
        timestamp: Date.now(),
        tracks: state.aircraft.size,
        detections: state.detections.length,
        alerts: state.geofenceAlerts.length,
      };
      // Keep last 60 points (5 minutes at 5s intervals)
      return { history: [...state.history, point].slice(-60) };
    }),
}));
