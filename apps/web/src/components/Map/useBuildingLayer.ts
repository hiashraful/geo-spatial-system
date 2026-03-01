import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/useMapStore';

const VECTOR_SOURCE_ID = 'openmaptiles';
const BUILDING_LAYER_ID = 'buildings-3d';

export function useBuildingLayer(
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

      // Add OpenMapTiles vector source for buildings
      if (!map.getSource(VECTOR_SOURCE_ID)) {
        map.addSource(VECTOR_SOURCE_ID, {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet',
        });
      }

      // 3D fill-extrusion layer for buildings
      if (!map.getLayer(BUILDING_LAYER_ID)) {
        map.addLayer(
          {
            id: BUILDING_LAYER_ID,
            type: 'fill-extrusion',
            source: VECTOR_SOURCE_ID,
            'source-layer': 'building',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'render_height'], 10],
                0, '#0d1a2a',
                20, '#112238',
                50, '#152a44',
                100, '#193250',
                200, '#1d3a5c',
              ],
              'fill-extrusion-height': [
                'coalesce',
                ['get', 'render_height'],
                10,
              ],
              'fill-extrusion-base': [
                'coalesce',
                ['get', 'render_min_height'],
                0,
              ],
              'fill-extrusion-opacity': 0.7,
            },
          },
          // Insert before aircraft layers so aircraft render on top
          'aircraft-trails'
        );
      }

      console.log('[Buildings] 3D layer initialized');
    }, 200);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded]);

  // Toggle visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const vis = layers.buildings ? 'visible' : 'none';
      if (map.getLayer(BUILDING_LAYER_ID)) {
        map.setLayoutProperty(BUILDING_LAYER_ID, 'visibility', vis);
      }
    } catch {}
  }, [layers.buildings, mapRef]);
}
