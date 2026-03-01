import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/useMapStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';

export function useGeofenceLayer(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapLoaded: MutableRefObject<boolean>
) {
  const initialized = useRef(false);
  const pulseAnimRef = useRef<number | null>(null);
  const layers = useMapStore((s) => s.layers);
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);

  useEffect(() => {
    if (initialized.current) return;

    const checkReady = setInterval(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded.current) return;

      initialized.current = true;
      clearInterval(checkReady);

      fetch('http://localhost:3001/api/geofences')
        .then((r) => r.json())
        .then((geojson) => {
          if (!map.getSource('geofence-source')) {
            map.addSource('geofence-source', { type: 'geojson', data: geojson });
          }

          // Fill layer with gradient-like opacity
          if (!map.getLayer('geofence-fill')) {
            map.addLayer({
              id: 'geofence-fill',
              type: 'fill',
              source: 'geofence-source',
              paint: {
                'fill-color': [
                  'match', ['get', 'zoneType'],
                  'restricted', '#ff4444',
                  'no_fly', '#ff0000',
                  'caution', '#ffaa00',
                  '#ffffff',
                ],
                'fill-opacity': 0.08,
              },
            });
          }

          // Outer glow border
          if (!map.getLayer('geofence-border-glow')) {
            map.addLayer({
              id: 'geofence-border-glow',
              type: 'line',
              source: 'geofence-source',
              paint: {
                'line-color': [
                  'match', ['get', 'zoneType'],
                  'restricted', '#ff4444',
                  'no_fly', '#ff0000',
                  'caution', '#ffaa00',
                  '#ffffff',
                ],
                'line-width': 6,
                'line-opacity': 0.15,
                'line-blur': 4,
              },
            });
          }

          // Main border - dashed
          if (!map.getLayer('geofence-border')) {
            map.addLayer({
              id: 'geofence-border',
              type: 'line',
              source: 'geofence-source',
              paint: {
                'line-color': [
                  'match', ['get', 'zoneType'],
                  'restricted', '#ff4444',
                  'no_fly', '#ff0000',
                  'caution', '#ffaa00',
                  '#ffffff',
                ],
                'line-width': 1.5,
                'line-dasharray': [6, 3],
                'line-opacity': 0.7,
              },
            });
          }

          // Breach pulse layer - wider pulsing border when alerts active
          if (!map.getLayer('geofence-breach-pulse')) {
            map.addLayer({
              id: 'geofence-breach-pulse',
              type: 'line',
              source: 'geofence-source',
              paint: {
                'line-color': [
                  'match', ['get', 'zoneType'],
                  'restricted', '#ff4444',
                  'no_fly', '#ff0000',
                  'caution', '#ffaa00',
                  '#ffffff',
                ],
                'line-width': 4,
                'line-opacity': 0,
                'line-blur': 2,
              },
              layout: {
                'visibility': 'none',
              },
            });
          }

          // Breach fill flash - brighter fill that pulses during breach
          if (!map.getLayer('geofence-breach-fill')) {
            map.addLayer({
              id: 'geofence-breach-fill',
              type: 'fill',
              source: 'geofence-source',
              paint: {
                'fill-color': [
                  'match', ['get', 'zoneType'],
                  'restricted', '#ff4444',
                  'no_fly', '#ff0000',
                  'caution', '#ffaa00',
                  '#ffffff',
                ],
                'fill-opacity': 0,
              },
              layout: {
                'visibility': 'none',
              },
            });
          }

          // Zone labels with type prefix
          if (!map.getLayer('geofence-labels')) {
            map.addLayer({
              id: 'geofence-labels',
              type: 'symbol',
              source: 'geofence-source',
              layout: {
                'text-field': [
                  'concat',
                  ['upcase', ['get', 'zoneType']],
                  ' - ',
                  ['get', 'name'],
                ],
                'text-font': ['Open Sans Regular'],
                'text-size': 11,
                'text-allow-overlap': false,
                'text-transform': 'uppercase',
                'symbol-placement': 'point',
              },
              paint: {
                'text-color': [
                  'match', ['get', 'zoneType'],
                  'restricted', '#ff6666',
                  'no_fly', '#ff4444',
                  'caution', '#ffcc44',
                  '#ffffff',
                ],
                'text-halo-color': '#000000cc',
                'text-halo-width': 1.5,
              },
            });
          }

          console.log('[Geofence] Layers initialized');
        })
        .catch((err) => console.warn('[Geofence] Load error:', err.message));
    }, 200);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded]);

  // Geofence breach pulse animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded.current) return;

    const hasAlerts = geofenceAlerts.length > 0;

    // Show/hide breach layers
    try {
      const breachVis = hasAlerts ? 'visible' : 'none';
      if (map.getLayer('geofence-breach-pulse')) {
        map.setLayoutProperty('geofence-breach-pulse', 'visibility', breachVis);
      }
      if (map.getLayer('geofence-breach-fill')) {
        map.setLayoutProperty('geofence-breach-fill', 'visibility', breachVis);
      }
    } catch {}

    // Cancel existing animation
    if (pulseAnimRef.current) {
      cancelAnimationFrame(pulseAnimRef.current);
      pulseAnimRef.current = null;
    }

    if (!hasAlerts) return;

    // Animate pulse
    let startTime = performance.now();
    const animate = (time: number) => {
      if (!map || !mapLoaded.current) return;
      const elapsed = time - startTime;
      // Pulse cycle: 1.5 seconds
      const t = (elapsed % 1500) / 1500;
      // Sine wave for smooth pulse: 0 -> 1 -> 0
      const pulse = Math.sin(t * Math.PI);

      try {
        if (map.getLayer('geofence-breach-pulse')) {
          map.setPaintProperty('geofence-breach-pulse', 'line-opacity', pulse * 0.6);
          map.setPaintProperty('geofence-breach-pulse', 'line-width', 3 + pulse * 5);
        }
        if (map.getLayer('geofence-breach-fill')) {
          map.setPaintProperty('geofence-breach-fill', 'fill-opacity', pulse * 0.12);
        }
      } catch {}

      pulseAnimRef.current = requestAnimationFrame(animate);
    };

    pulseAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (pulseAnimRef.current) {
        cancelAnimationFrame(pulseAnimRef.current);
        pulseAnimRef.current = null;
      }
    };
  }, [geofenceAlerts, mapRef, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = layers.geofences ? 'visible' : 'none';
    try {
      ['geofence-fill', 'geofence-border', 'geofence-border-glow', 'geofence-labels',
       'geofence-breach-pulse', 'geofence-breach-fill'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
      });
    } catch {}
  }, [layers.geofences, mapRef]);
}
