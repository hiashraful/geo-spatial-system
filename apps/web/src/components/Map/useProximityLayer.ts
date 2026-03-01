import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import type { AircraftData } from '../../store/useTelemetryStore';
import { useMapStore } from '../../store/useMapStore';

// Haversine distance in nautical miles
function haversineNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in NM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface ConflictPair {
  a: AircraftData;
  b: AircraftData;
  distNM: number;
  altDiffFt: number;
}

function detectConflicts(aircraft: Map<string, AircraftData>): ConflictPair[] {
  const conflicts: ConflictPair[] = [];
  const acList = Array.from(aircraft.values()).filter((ac) => !ac.onGround && ac.altitude > 1000);

  for (let i = 0; i < acList.length; i++) {
    for (let j = i + 1; j < acList.length; j++) {
      const a = acList[i];
      const b = acList[j];
      const altDiff = Math.abs(a.altitude - b.altitude);

      // Only check if within 1000ft vertical
      if (altDiff > 1000) continue;

      const dist = haversineNM(a.latitude, a.longitude, b.latitude, b.longitude);
      // Conflict if within 5 NM horizontally
      if (dist < 5) {
        conflicts.push({ a, b, distNM: dist, altDiffFt: altDiff });
      }
    }
  }

  return conflicts;
}

function conflictsToGeoJSON(conflicts: ConflictPair[]) {
  const features: any[] = [];

  for (const c of conflicts) {
    // Line connecting the two aircraft
    features.push({
      type: 'Feature',
      properties: {
        type: 'line',
        distNM: Math.round(c.distNM * 10) / 10,
        altDiff: c.altDiffFt,
        callsignA: c.a.callsign,
        callsignB: c.b.callsign,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [c.a.longitude, c.a.latitude],
          [c.b.longitude, c.b.latitude],
        ],
      },
    });

    // Midpoint label
    const midLat = (c.a.latitude + c.b.latitude) / 2;
    const midLon = (c.a.longitude + c.b.longitude) / 2;
    features.push({
      type: 'Feature',
      properties: {
        type: 'label',
        text: `${Math.round(c.distNM * 10) / 10}NM / ${c.altDiffFt}ft`,
      },
      geometry: {
        type: 'Point',
        coordinates: [midLon, midLat],
      },
    });

    // Warning circles around each aircraft
    features.push({
      type: 'Feature',
      properties: { type: 'warning' },
      geometry: { type: 'Point', coordinates: [c.a.longitude, c.a.latitude] },
    });
    features.push({
      type: 'Feature',
      properties: { type: 'warning' },
      geometry: { type: 'Point', coordinates: [c.b.longitude, c.b.latitude] },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function useProximityLayer(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapLoaded: MutableRefObject<boolean>
) {
  const initialized = useRef(false);
  const aircraft = useTelemetryStore((s) => s.aircraft);
  const layers = useMapStore((s) => s.layers);

  useEffect(() => {
    if (initialized.current) return;

    const checkReady = setInterval(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded.current) return;

      initialized.current = true;
      clearInterval(checkReady);

      if (!map.getSource('proximity-source')) {
        map.addSource('proximity-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // Conflict line
      if (!map.getLayer('proximity-lines')) {
        map.addLayer({
          id: 'proximity-lines',
          type: 'line',
          source: 'proximity-source',
          filter: ['==', ['get', 'type'], 'line'],
          paint: {
            'line-color': '#ff0000',
            'line-width': 1.5,
            'line-dasharray': [3, 3],
            'line-opacity': 0.8,
          },
        });
      }

      // Warning rings
      if (!map.getLayer('proximity-warnings')) {
        map.addLayer({
          id: 'proximity-warnings',
          type: 'circle',
          source: 'proximity-source',
          filter: ['==', ['get', 'type'], 'warning'],
          paint: {
            'circle-radius': 18,
            'circle-color': 'transparent',
            'circle-stroke-color': '#ff0000',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 0.7,
          },
        });
      }

      // Conflict labels
      if (!map.getLayer('proximity-labels')) {
        map.addLayer({
          id: 'proximity-labels',
          type: 'symbol',
          source: 'proximity-source',
          filter: ['==', ['get', 'type'], 'label'],
          layout: {
            'text-field': ['get', 'text'],
            'text-font': ['Open Sans Regular'],
            'text-size': 10,
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#ff4444',
            'text-halo-color': '#000000',
            'text-halo-width': 2,
          },
        });
      }

      console.log('[Proximity] Layer initialized');
    }, 150);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded]);

  // Update conflicts
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const source = map.getSource('proximity-source') as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const conflicts = detectConflicts(aircraft);
      source.setData(conflictsToGeoJSON(conflicts) as any);
    } catch {}
  }, [aircraft, mapRef]);

  // Toggle visibility with aircraft layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const vis = layers.aircraft ? 'visible' : 'none';
      if (map.getLayer('proximity-lines')) map.setLayoutProperty('proximity-lines', 'visibility', vis);
      if (map.getLayer('proximity-warnings')) map.setLayoutProperty('proximity-warnings', 'visibility', vis);
      if (map.getLayer('proximity-labels')) map.setLayoutProperty('proximity-labels', 'visibility', vis);
    } catch {}
  }, [layers.aircraft, mapRef]);
}
