import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/useMapStore';

const NM_TO_DEG = 1 / 60; // 1 nautical mile = 1/60 degree latitude
const RING_DISTANCES_NM = [5, 10, 25, 50]; // nautical miles
const BEARING_LINE_INTERVAL = 30; // degrees

function createCircle(centerLng: number, centerLat: number, radiusNm: number, segments = 64): [number, number][] {
  const coords: [number, number][] = [];
  const latRad = (centerLat * Math.PI) / 180;
  const radiusDeg = radiusNm * NM_TO_DEG;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const lat = centerLat + radiusDeg * Math.cos(angle);
    const lng = centerLng + (radiusDeg * Math.sin(angle)) / Math.cos(latRad);
    coords.push([lng, lat]);
  }
  return coords;
}

function generateRangeRingGeoJSON(centerLng: number, centerLat: number) {
  const features: any[] = [];

  // Range rings
  for (const dist of RING_DISTANCES_NM) {
    features.push({
      type: 'Feature',
      properties: { type: 'ring', distance: dist, label: `${dist} NM` },
      geometry: {
        type: 'LineString',
        coordinates: createCircle(centerLng, centerLat, dist),
      },
    });

    // Label at north point of each ring
    const labelLat = centerLat + dist * NM_TO_DEG;
    features.push({
      type: 'Feature',
      properties: { type: 'ring-label', label: `${dist}nm` },
      geometry: {
        type: 'Point',
        coordinates: [centerLng, labelLat],
      },
    });
  }

  // Bearing lines
  const maxRadius = 50 * NM_TO_DEG;
  const latRad = (centerLat * Math.PI) / 180;
  for (let bearing = 0; bearing < 360; bearing += BEARING_LINE_INTERVAL) {
    const angle = (bearing * Math.PI) / 180;
    const endLat = centerLat + maxRadius * Math.cos(angle);
    const endLng = centerLng + (maxRadius * Math.sin(angle)) / Math.cos(latRad);
    features.push({
      type: 'Feature',
      properties: { type: 'bearing', bearing },
      geometry: {
        type: 'LineString',
        coordinates: [
          [centerLng, centerLat],
          [endLng, endLat],
        ],
      },
    });

    // Bearing label at outer ring
    features.push({
      type: 'Feature',
      properties: {
        type: 'bearing-label',
        label: `${bearing.toString().padStart(3, '0')}`,
      },
      geometry: {
        type: 'Point',
        coordinates: [endLng, endLat],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function useRangeRings(
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

      const center = map.getCenter();
      const geojson = generateRangeRingGeoJSON(center.lng, center.lat);

      if (!map.getSource('range-rings-source')) {
        map.addSource('range-rings-source', {
          type: 'geojson',
          data: geojson as any,
        });
      }

      // Ring lines
      if (!map.getLayer('range-rings')) {
        map.addLayer({
          id: 'range-rings',
          type: 'line',
          source: 'range-rings-source',
          filter: ['==', ['get', 'type'], 'ring'],
          paint: {
            'line-color': '#00ff8815',
            'line-width': 1,
            'line-dasharray': [6, 6],
          },
          layout: {
            visibility: 'none',
          },
        });
      }

      // Bearing lines
      if (!map.getLayer('range-bearings')) {
        map.addLayer({
          id: 'range-bearings',
          type: 'line',
          source: 'range-rings-source',
          filter: ['==', ['get', 'type'], 'bearing'],
          paint: {
            'line-color': '#00ff8808',
            'line-width': 0.5,
          },
          layout: {
            visibility: 'none',
          },
        });
      }

      // Ring labels
      if (!map.getLayer('range-ring-labels')) {
        map.addLayer({
          id: 'range-ring-labels',
          type: 'symbol',
          source: 'range-rings-source',
          filter: ['==', ['get', 'type'], 'ring-label'],
          layout: {
            'text-field': ['get', 'label'],
            'text-font': ['Open Sans Regular'],
            'text-size': 9,
            'text-allow-overlap': true,
            visibility: 'none',
          },
          paint: {
            'text-color': '#00ff8830',
            'text-halo-color': '#00000088',
            'text-halo-width': 1,
          },
        });
      }

      // Bearing labels
      if (!map.getLayer('range-bearing-labels')) {
        map.addLayer({
          id: 'range-bearing-labels',
          type: 'symbol',
          source: 'range-rings-source',
          filter: ['==', ['get', 'type'], 'bearing-label'],
          layout: {
            'text-field': ['get', 'label'],
            'text-font': ['Open Sans Regular'],
            'text-size': 8,
            'text-allow-overlap': true,
            visibility: 'none',
          },
          paint: {
            'text-color': '#00ff8820',
            'text-halo-color': '#00000066',
            'text-halo-width': 1,
          },
        });
      }

      // Update center when map moves
      const updateCenter = () => {
        try {
          const c = map.getCenter();
          const data = generateRangeRingGeoJSON(c.lng, c.lat);
          const src = map.getSource('range-rings-source') as maplibregl.GeoJSONSource;
          if (src) src.setData(data as any);
        } catch {}
      };

      map.on('moveend', updateCenter);

      console.log('[RangeRings] Initialized');
    }, 200);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded]);

  // Toggle visibility with grid layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = layers.grid ? 'visible' : 'none';
    try {
      ['range-rings', 'range-bearings', 'range-ring-labels', 'range-bearing-labels'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
      });
    } catch {}
  }, [layers.grid, mapRef]);
}
