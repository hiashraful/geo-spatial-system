import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useMapStore } from '../../store/useMapStore';

export function useDetectionLayer(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapLoaded: MutableRefObject<boolean>
) {
  const initialized = useRef(false);
  const detections = useTelemetryStore((s) => s.detections);
  const layers = useMapStore((s) => s.layers);

  useEffect(() => {
    if (initialized.current) return;

    const checkReady = setInterval(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded.current) return;

      initialized.current = true;
      clearInterval(checkReady);

      if (!map.getSource('detections-source')) {
        map.addSource('detections-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      if (!map.getLayer('detection-circles')) {
        map.addLayer({
          id: 'detection-circles',
          type: 'circle',
          source: 'detections-source',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'confidence'], 0.6, 3, 1.0, 7],
            'circle-color': [
              'match', ['get', 'className'],
              'vehicle', '#44aaff',
              'person', '#ffaa00',
              'truck', '#ff6644',
              'bus', '#aa44ff',
              'bicycle', '#44ff88',
              'motorcycle', '#ff44aa',
              'emergency_vehicle', '#ff0000',
              'suspicious_package', '#ff0000',
              '#ffffff',
            ],
            'circle-opacity': 0.7,
            'circle-stroke-color': '#ffffff22',
            'circle-stroke-width': 1,
          },
        });
      }

      console.log('[Detection] Layer initialized');
    }, 300);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const source = map.getSource('detections-source') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: detections.map((det) => ({
            type: 'Feature',
            properties: { id: det.id, className: det.className, confidence: det.confidence },
            geometry: { type: 'Point', coordinates: [det.longitude, det.latitude] },
          })),
        } as any);
      }
    } catch {}
  }, [detections, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (map.getLayer('detection-circles')) {
        map.setLayoutProperty('detection-circles', 'visibility', layers.detections ? 'visible' : 'none');
      }
    } catch {}
  }, [layers.detections, mapRef]);
}
