import { useEffect, useRef, useCallback } from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';

const WS_URL = 'ws://localhost:3001/ws';
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const pingTimer = useRef<number | null>(null);
  const pingSentAt = useRef<number>(0);
  const msgCount = useRef<number>(0);
  const rateTimer = useRef<number | null>(null);

  const updateAircraft = useTelemetryStore((s) => s.updateAircraft);
  const updateDetections = useTelemetryStore((s) => s.updateDetections);
  const addGeofenceAlert = useTelemetryStore((s) => s.addGeofenceAlert);
  const setWsConnected = useTelemetryStore((s) => s.setWsConnected);
  const setWsLatency = useTelemetryStore((s) => s.setWsLatency);
  const setMsgRate = useTelemetryStore((s) => s.setMsgRate);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setWsConnected(true);

        // Start ping for latency measurement
        pingTimer.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingSentAt.current = performance.now();
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);

        // Track message rate every 5 seconds
        rateTimer.current = window.setInterval(() => {
          setMsgRate(Math.round(msgCount.current / 5));
          msgCount.current = 0;
        }, 5000);
      };

      ws.onmessage = (event) => {
        msgCount.current++;
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'init':
              updateAircraft(msg.data.aircraft);
              break;
            case 'telemetry':
              updateAircraft(msg.data.aircraft);
              break;
            case 'detections':
              updateDetections(msg.data);
              break;
            case 'geofence_alert':
              addGeofenceAlert(msg.data);
              break;
            case 'aircraft_removed':
              // Handle removed aircraft
              break;
            case 'pong':
              if (pingSentAt.current > 0) {
                const latency = Math.round(performance.now() - pingSentAt.current);
                setWsLatency(latency);
                pingSentAt.current = 0;
              }
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setWsConnected(false);
        cleanup();
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      scheduleReconnect();
    }
  }, [updateAircraft, updateDetections, addGeofenceAlert, setWsConnected]);

  const cleanup = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
    if (rateTimer.current) {
      clearInterval(rateTimer.current);
      rateTimer.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;
    reconnectTimer.current = window.setTimeout(() => {
      reconnectTimer.current = null;
      connect();
    }, RECONNECT_DELAY);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      cleanup();
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, cleanup]);

  return wsRef;
}
