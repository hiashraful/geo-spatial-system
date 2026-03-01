import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/useMapStore';

const GRID_SOURCE_ID = 'grid-source';
const GRID_LINES_ID = 'grid-lines';
const GRID_LABELS_ID = 'grid-labels';

function generateGridGeoJSON(bounds: maplibregl.LngLatBounds, zoom: number) {
  // Determine grid spacing based on zoom level
  let step: number;
  if (zoom >= 14) step = 0.01;       // ~1.1km
  else if (zoom >= 12) step = 0.05;  // ~5.5km
  else if (zoom >= 10) step = 0.1;   // ~11km
  else if (zoom >= 8) step = 0.5;    // ~55km
  else if (zoom >= 6) step = 1;      // ~111km
  else step = 5;                      // ~555km

  const features: any[] = [];

  const west = Math.floor(bounds.getWest() / step) * step;
  const east = Math.ceil(bounds.getEast() / step) * step;
  const south = Math.floor(bounds.getSouth() / step) * step;
  const north = Math.ceil(bounds.getNorth() / step) * step;

  // Vertical lines (longitude)
  for (let lng = west; lng <= east; lng += step) {
    features.push({
      type: 'Feature',
      properties: { label: lng.toFixed(lng % 1 === 0 ? 0 : 2), type: 'lng' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [lng, south],
          [lng, north],
        ],
      },
    });
  }

  // Horizontal lines (latitude)
  for (let lat = south; lat <= north; lat += step) {
    features.push({
      type: 'Feature',
      properties: { label: lat.toFixed(lat % 1 === 0 ? 0 : 2), type: 'lat' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [west, lat],
          [east, lat],
        ],
      },
    });
  }

  // Label points at intersections (fewer labels)
  const labelStep = step * (zoom < 10 ? 1 : 2);
  for (let lng = west; lng <= east; lng += labelStep) {
    for (let lat = south; lat <= north; lat += labelStep) {
      features.push({
        type: 'Feature',
        properties: {
          label: `${lat.toFixed(lat % 1 === 0 ? 0 : 2)}, ${lng.toFixed(lng % 1 === 0 ? 0 : 2)}`,
          type: 'point',
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

export function useGridOverlay(
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

      // Add grid source
      if (!map.getSource(GRID_SOURCE_ID)) {
        map.addSource(GRID_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // Grid lines
      if (!map.getLayer(GRID_LINES_ID)) {
        map.addLayer({
          id: GRID_LINES_ID,
          type: 'line',
          source: GRID_SOURCE_ID,
          filter: ['!=', ['get', 'type'], 'point'],
          paint: {
            'line-color': '#00ff8818',
            'line-width': 0.5,
          },
          layout: {
            visibility: 'none',
          },
        });
      }

      // Grid labels
      if (!map.getLayer(GRID_LABELS_ID)) {
        map.addLayer({
          id: GRID_LABELS_ID,
          type: 'symbol',
          source: GRID_SOURCE_ID,
          filter: ['==', ['get', 'type'], 'point'],
          layout: {
            'text-field': ['get', 'label'],
            'text-font': ['Open Sans Regular'],
            'text-size': 8,
            'text-anchor': 'bottom-left',
            'text-offset': [0.3, -0.3],
            'text-allow-overlap': false,
            visibility: 'none',
          },
          paint: {
            'text-color': '#00ff8830',
            'text-halo-color': '#00000044',
            'text-halo-width': 1,
          },
        });
      }

      // Update grid on move/zoom
      const updateGrid = () => {
        if (!layers.grid) return;
        try {
          const source = map.getSource(GRID_SOURCE_ID) as maplibregl.GeoJSONSource;
          if (source) {
            const bounds = map.getBounds();
            const zoom = map.getZoom();
            source.setData(generateGridGeoJSON(bounds, zoom) as any);
          }
        } catch {}
      };

      map.on('moveend', updateGrid);
      map.on('zoomend', updateGrid);

      console.log('[Grid] Overlay initialized');
    }, 200);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded, layers.grid]);

  // Toggle visibility and update data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const vis = layers.grid ? 'visible' : 'none';
      if (map.getLayer(GRID_LINES_ID)) map.setLayoutProperty(GRID_LINES_ID, 'visibility', vis);
      if (map.getLayer(GRID_LABELS_ID)) map.setLayoutProperty(GRID_LABELS_ID, 'visibility', vis);

      // Update grid data when toggled on
      if (layers.grid) {
        const source = map.getSource(GRID_SOURCE_ID) as maplibregl.GeoJSONSource;
        if (source) {
          const bounds = map.getBounds();
          const zoom = map.getZoom();
          source.setData(generateGridGeoJSON(bounds, zoom) as any);
        }
      }
    } catch {}
  }, [layers.grid, mapRef]);
}
