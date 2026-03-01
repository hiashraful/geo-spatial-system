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

function createSelectedIcon(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="none" stroke="#00ff88" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>
    <path d="M20 4 L23.5 14 L34 16.5 L23.5 19 L23.5 32 L20 29.5 L16.5 32 L16.5 19 L6 16.5 L16.5 14 Z"
          fill="#00ffcc" stroke="#fff" stroke-width="0.8" opacity="1"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function createEmergencyIcon(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M16 2 L19 12 L28 14 L19 16 L19 26 L16 24 L13 26 L13 16 L4 14 L13 12 Z"
          fill="#ff3333" stroke="#ff0000" stroke-width="1" opacity="0.95"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function aircraftToGeoJSON(aircraftMap: Map<string, AircraftData>, selectedIcao: string | null) {
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
      isSelected: ac.icao24 === selectedIcao ? 1 : 0,
      isEmergency: (ac.squawk === '7700' || ac.squawk === '7600' || ac.squawk === '7500') ? 1 : 0,
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [ac.longitude, ac.latitude],
    },
  }));
  return { type: 'FeatureCollection' as const, features };
}

function trailsToGeoJSON(aircraftMap: Map<string, AircraftData>, selectedIcao: string | null) {
  const features = Array.from(aircraftMap.values())
    .filter((ac) => ac.trail && ac.trail.length > 1)
    .map((ac) => ({
      type: 'Feature' as const,
      properties: {
        icao24: ac.icao24,
        altitude: ac.altitude,
        // Altitude band: 0=low(<5k), 1=med(5k-15k), 2=high(15k-30k), 3=vhigh(>30k)
        altBand: ac.altitude < 5000 ? 0 : ac.altitude < 15000 ? 1 : ac.altitude < 30000 ? 2 : 3,
        isSelected: ac.icao24 === selectedIcao ? 1 : 0,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: ac.trail.map(([lat, lon]) => [lon, lat]),
      },
    }));
  return { type: 'FeatureCollection' as const, features };
}

function predictionsToGeoJSON(aircraftMap: Map<string, AircraftData>, selectedIcao: string | null) {
  const features = Array.from(aircraftMap.values())
    .filter((ac) => ac.velocity > 50 && !ac.onGround) // Only for airborne, moving aircraft
    .map((ac) => {
      // Project 60 seconds ahead based on heading and velocity
      const speedMps = ac.velocity * 0.514444; // knots to m/s
      const distanceM = speedMps * 60; // 60 second prediction
      const distanceDeg = distanceM / 111320; // rough meters to degrees
      const hdgRad = (ac.heading * Math.PI) / 180;
      const endLat = ac.latitude + distanceDeg * Math.cos(hdgRad);
      const endLon = ac.longitude + distanceDeg * Math.sin(hdgRad) / Math.cos(ac.latitude * Math.PI / 180);
      return {
        type: 'Feature' as const,
        properties: {
          icao24: ac.icao24,
          isSelected: ac.icao24 === selectedIcao ? 1 : 0,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [ac.longitude, ac.latitude],
            [endLon, endLat],
          ],
        },
      };
    });
  return { type: 'FeatureCollection' as const, features };
}

function setupLayers(map: maplibregl.Map) {
  // Load icons
  const loadImage = (name: string, src: string, size: number) => {
    return new Promise<void>((resolve) => {
      const img = new Image(size, size);
      img.onload = () => {
        if (!map.hasImage(name)) {
          map.addImage(name, img, { sdf: false });
        }
        resolve();
      };
      img.src = src;
    });
  };

  Promise.all([
    loadImage('aircraft-icon', createAircraftIcon('#00ff88'), 32),
    loadImage('aircraft-selected', createSelectedIcon(), 40),
    loadImage('aircraft-emergency', createEmergencyIcon(), 32),
  ]).then(() => {
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
        lineMetrics: true,
      });
    }
    if (!map.getSource('prediction-source')) {
      map.addSource('prediction-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // Trail layer - normal with fade decay (line-gradient)
    if (!map.getLayer('aircraft-trails')) {
      map.addLayer({
        id: 'aircraft-trails',
        type: 'line',
        source: 'trails-source',
        filter: ['==', ['get', 'isSelected'], 0],
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['get', 'altitude'],
            0, '#00ff88',
            5000, '#44ddff',
            15000, '#ffaa00',
            30000, '#ff4488',
            45000, '#cc44ff',
          ],
          'line-width': 1.2,
          'line-opacity': 0.5,
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0, 'rgba(0, 255, 136, 0)',
            0.3, 'rgba(0, 255, 136, 0.15)',
            0.7, 'rgba(0, 255, 136, 0.35)',
            1, 'rgba(0, 255, 136, 0.6)',
          ],
        },
      });
    }

    // Trail layer - selected with brighter fade
    if (!map.getLayer('aircraft-trails-selected')) {
      map.addLayer({
        id: 'aircraft-trails-selected',
        type: 'line',
        source: 'trails-source',
        filter: ['==', ['get', 'isSelected'], 1],
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['get', 'altitude'],
            0, '#44ffaa',
            5000, '#66eeff',
            15000, '#ffcc33',
            30000, '#ff66aa',
            45000, '#dd66ff',
          ],
          'line-width': 2.5,
          'line-opacity': 0.9,
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0, 'rgba(0, 255, 204, 0)',
            0.2, 'rgba(0, 255, 204, 0.2)',
            0.5, 'rgba(0, 255, 204, 0.5)',
            1, 'rgba(0, 255, 204, 0.95)',
          ],
        },
      });
    }

    // Prediction lines - dotted lines showing projected path
    if (!map.getLayer('aircraft-predictions')) {
      map.addLayer({
        id: 'aircraft-predictions',
        type: 'line',
        source: 'prediction-source',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'isSelected'], 1], '#00ffcc',
            '#00ff8844',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'isSelected'], 1], 1.5,
            0.8,
          ],
          'line-dasharray': [2, 4],
          'line-opacity': [
            'case',
            ['==', ['get', 'isSelected'], 1], 0.8,
            0.3,
          ],
        },
      });
    }

    // Aircraft symbols - regular
    if (!map.getLayer('aircraft-symbols')) {
      map.addLayer({
        id: 'aircraft-symbols',
        type: 'symbol',
        source: 'aircraft-source',
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'isSelected'], 1], 'aircraft-selected',
            ['==', ['get', 'isEmergency'], 1], 'aircraft-emergency',
            'aircraft-icon',
          ],
          'icon-size': [
            'case',
            ['==', ['get', 'isSelected'], 1], 1.0,
            0.8,
          ],
          'icon-rotate': ['get', 'heading'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['get', 'callsign'],
          'text-font': ['Open Sans Regular'],
          'text-size': [
            'case',
            ['==', ['get', 'isSelected'], 1], 12,
            10,
          ],
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'symbol-sort-key': [
            'case',
            ['==', ['get', 'isSelected'], 1], 100,
            ['==', ['get', 'isEmergency'], 1], 50,
            0,
          ],
        },
        paint: {
          'text-color': [
            'case',
            ['==', ['get', 'isSelected'], 1], '#ffffff',
            ['==', ['get', 'isEmergency'], 1], '#ff4444',
            '#88ffaa',
          ],
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
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
          'text-field': ['concat', 'FL', ['to-string', ['round', ['/', ['get', 'altitude'], 100]]]],
          'text-font': ['Open Sans Regular'],
          'text-size': 9,
          'text-offset': [2.5, 0],
          'text-anchor': 'left',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': [
            'case',
            ['==', ['get', 'isSelected'], 1], '#00ffcc99',
            '#aaffcc66',
          ],
          'text-halo-color': '#00000088',
          'text-halo-width': 1,
        },
      });
    }

    console.log('[Aircraft] Layers initialized with selection support');
  });
}

export function useAircraftLayer(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapLoaded: MutableRefObject<boolean>
) {
  const initialized = useRef(false);
  const aircraft = useTelemetryStore((s) => s.aircraft);
  const layers = useMapStore((s) => s.layers);
  const selectedAircraft = useMapStore((s) => s.selectedAircraft);

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

    try {
      const source = map.getSource('aircraft-source') as maplibregl.GeoJSONSource | undefined;
      const trailSource = map.getSource('trails-source') as maplibregl.GeoJSONSource | undefined;
      const predSource = map.getSource('prediction-source') as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(aircraftToGeoJSON(aircraft, selectedAircraft) as any);
      if (trailSource) trailSource.setData(trailsToGeoJSON(aircraft, selectedAircraft) as any);
      if (predSource) predSource.setData(predictionsToGeoJSON(aircraft, selectedAircraft) as any);
    } catch {
      // Sources not ready yet
    }
  }, [aircraft, selectedAircraft, mapRef]);

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
      if (map.getLayer('aircraft-trails-selected')) map.setLayoutProperty('aircraft-trails-selected', 'visibility', trailVis);
      if (map.getLayer('aircraft-predictions')) map.setLayoutProperty('aircraft-predictions', 'visibility', trailVis);
    } catch {}
  }, [layers.aircraft, layers.trails, mapRef]);
}
