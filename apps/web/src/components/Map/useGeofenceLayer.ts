import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/useMapStore';

export function useGeofenceLayer(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapLoaded: MutableRefObject<boolean>
) {
  const initialized = useRef(false);
  const layers = useMapStore((s) => s.layers);

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

          if (!map.getLayer('geofence-fill')) {
            map.addLayer({
              id: 'geofence-fill',
              type: 'fill',
              source: 'geofence-source',
              paint: {
                'fill-color': [
                  'match', ['get', 'zoneType'],
                  'restricted', '#ff444433',
                  'no_fly', '#ff000033',
                  'caution', '#ffaa0022',
                  '#ffffff11',
                ],
                'fill-opacity': 0.4,
              },
            });
          }

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
                'line-width': 2,
                'line-dasharray': [4, 2],
                'line-opacity': 0.8,
              },
            });
          }

          if (!map.getLayer('geofence-labels')) {
            map.addLayer({
              id: 'geofence-labels',
              type: 'symbol',
              source: 'geofence-source',
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Regular'],
                'text-size': 11,
                'text-allow-overlap': false,
              },
              paint: {
                'text-color': '#ff6666',
                'text-halo-color': '#000000',
                'text-halo-width': 1,
              },
            });
          }

          console.log('[Geofence] Layers initialized');
        })
        .catch((err) => console.warn('[Geofence] Load error:', err.message));
    }, 200);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = layers.geofences ? 'visible' : 'none';
    try {
      ['geofence-fill', 'geofence-border', 'geofence-labels'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
      });
    } catch {}
  }, [layers.geofences, mapRef]);
}
