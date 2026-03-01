import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import type { AircraftData } from '../../store/useTelemetryStore';
import { useMapStore } from '../../store/useMapStore';

function createAircraftIcon(color = '#00ff88'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M16 2 L19 12 L28 14 L19 16 L19 26 L16 24 L13 26 L13 16 L4 14 L13 12 Z"
          fill="${color}" stroke="#000" stroke-width="0.5" opacity="0.95"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function aircraftToGeoJSON(aircraftMap: Map<string, AircraftData>) {
  const features = Array.from(aircraftMap.values()).map((ac) => ({
    type: 'Feature' as const,
    properties: {
      icao24: ac.icao24,
      callsign: ac.callsign || '',
      altitude: ac.altitude,
      heading: ac.heading,
      velocity: ac.velocity,
      verticalRate: ac.verticalRate,
      squawk: ac.squawk,
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [ac.longitude, ac.latitude],
    },
  }));
  return { type: 'FeatureCollection' as const, features };
}

function trailsToGeoJSON(aircraftMap: Map<string, AircraftData>) {
  const features = Array.from(aircraftMap.values())
    .filter((ac) => ac.trail && ac.trail.length > 1)
    .map((ac) => ({
      type: 'Feature' as const,
      properties: { icao24: ac.icao24, altitude: ac.altitude },
      geometry: {
        type: 'LineString' as const,
        coordinates: ac.trail.map(([lat, lon]) => [lon, lat]),
      },
    }));
  return { type: 'FeatureCollection' as const, features };
}

function setupLayers(map: maplibregl.Map) {
  // Load icon
  const img = new Image(32, 32);
  img.onload = () => {
    if (map.hasImage('aircraft-icon')) return;
    map.addImage('aircraft-icon', img, { sdf: false });

    // Add sources
    if (!map.getSource('aircraft-source')) {
      map.addSource('aircraft-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getSource('trails-source')) {
      map.addSource('trails-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // Trail layer
    if (!map.getLayer('aircraft-trails')) {
      map.addLayer({
        id: 'aircraft-trails',
        type: 'line',
        source: 'trails-source',
        paint: {
          'line-color': '#00ff8866',
          'line-width': 1.5,
          'line-opacity': 0.6,
        },
      });
    }

    // Aircraft symbols
    if (!map.getLayer('aircraft-symbols')) {
      map.addLayer({
        id: 'aircraft-symbols',
        type: 'symbol',
        source: 'aircraft-source',
        layout: {
          'icon-image': 'aircraft-icon',
          'icon-size': 0.8,
          'icon-rotate': ['get', 'heading'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['get', 'callsign'],
          'text-font': ['Open Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#88ffaa',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });
    }

    // Altitude labels at higher zoom
    if (!map.getLayer('aircraft-altitude-labels')) {
      map.addLayer({
        id: 'aircraft-altitude-labels',
        type: 'symbol',
        source: 'aircraft-source',
        minzoom: 9,
        layout: {
          'text-field': ['concat', ['to-string', ['round', ['/', ['get', 'altitude'], 100]]], ''],
          'text-font': ['Open Sans Regular'],
          'text-size': 9,
          'text-offset': [2.5, 0],
          'text-anchor': 'left',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#aaffcc88',
          'text-halo-color': '#00000088',
          'text-halo-width': 1,
        },
      });
    }

    console.log('[Aircraft] Layers initialized');
  };
  img.src = createAircraftIcon('#00ff88');
}

export function useAircraftLayer(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapLoaded: MutableRefObject<boolean>
) {
  const initialized = useRef(false);
  const aircraft = useTelemetryStore((s) => s.aircraft);
  const layers = useMapStore((s) => s.layers);

  // Initialize: poll until map is ready
  useEffect(() => {
    if (initialized.current) return;

    const checkReady = setInterval(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded.current) return;

      // Map is ready - set up layers
      initialized.current = true;
      clearInterval(checkReady);
      setupLayers(map);
    }, 150);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded]);

  // Update data on each aircraft change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Try to update - sources may not exist yet
    try {
      const source = map.getSource('aircraft-source') as maplibregl.GeoJSONSource | undefined;
      const trailSource = map.getSource('trails-source') as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(aircraftToGeoJSON(aircraft) as any);
      if (trailSource) trailSource.setData(trailsToGeoJSON(aircraft) as any);
    } catch {
      // Sources not ready yet
    }
  }, [aircraft, mapRef]);

  // Toggle visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const vis = layers.aircraft ? 'visible' : 'none';
      const trailVis = layers.trails ? 'visible' : 'none';
      if (map.getLayer('aircraft-symbols')) map.setLayoutProperty('aircraft-symbols', 'visibility', vis);
      if (map.getLayer('aircraft-altitude-labels')) map.setLayoutProperty('aircraft-altitude-labels', 'visibility', vis);
      if (map.getLayer('aircraft-trails')) map.setLayoutProperty('aircraft-trails', 'visibility', trailVis);
    } catch {}
  }, [layers.aircraft, layers.trails, mapRef]);
}
