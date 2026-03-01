import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useMapStore } from '../../store/useMapStore';

export function useHeatmapLayer(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapLoaded: MutableRefObject<boolean>
) {
  const initialized = useRef(false);
  const detections = useTelemetryStore((s) => s.detections);
  const layers = useMapStore((s) => s.layers);

  // Initialize
  useEffect(() => {
    if (initialized.current) return;

    const checkReady = setInterval(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded.current) return;

      initialized.current = true;
      clearInterval(checkReady);

      if (!map.getSource('heatmap-source')) {
        map.addSource('heatmap-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      if (!map.getLayer('detection-heatmap')) {
        map.addLayer({
          id: 'detection-heatmap',
          type: 'heatmap',
          source: 'heatmap-source',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': [
              'interpolate', ['linear'], ['zoom'],
              0, 1,
              15, 3,
            ],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.1, 'rgba(0, 255, 136, 0.1)',
              0.3, 'rgba(0, 255, 136, 0.3)',
              0.5, 'rgba(255, 200, 0, 0.5)',
              0.7, 'rgba(255, 100, 0, 0.7)',
              1, 'rgba(255, 0, 0, 0.9)',
            ],
            'heatmap-radius': [
              'interpolate', ['linear'], ['zoom'],
              0, 10,
              15, 40,
            ],
            'heatmap-opacity': 0.7,
          },
        });
      }

      console.log('[Heatmap] Layer initialized');
    }, 150);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded]);

  // Update data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const source = map.getSource('heatmap-source') as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const features = detections.map((d) => ({
        type: 'Feature' as const,
        properties: {
          weight: d.confidence,
          className: d.className,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [d.longitude, d.latitude],
        },
      }));

      source.setData({ type: 'FeatureCollection', features });
    } catch {}
  }, [detections, mapRef]);

  // Toggle visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const vis = layers.heatmap ? 'visible' : 'none';
      if (map.getLayer('detection-heatmap')) {
        map.setLayoutProperty('detection-heatmap', 'visibility', vis);
      }
    } catch {}
  }, [layers.heatmap, mapRef]);
}
