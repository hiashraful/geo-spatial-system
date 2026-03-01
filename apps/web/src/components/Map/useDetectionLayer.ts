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

      // Outer glow ring
      if (!map.getLayer('detection-glow')) {
        map.addLayer({
          id: 'detection-glow',
          type: 'circle',
          source: 'detections-source',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'confidence'], 0.6, 8, 1.0, 14],
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
            'circle-opacity': 0.12,
            'circle-blur': 1,
          },
        });
      }

      // Main detection dots
      if (!map.getLayer('detection-circles')) {
        map.addLayer({
          id: 'detection-circles',
          type: 'circle',
          source: 'detections-source',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'confidence'], 0.6, 3, 1.0, 6],
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
            'circle-opacity': 0.8,
            'circle-stroke-color': '#ffffff22',
            'circle-stroke-width': 0.5,
          },
        });
      }

      // Labels at high zoom for emergency/suspicious
      if (!map.getLayer('detection-labels')) {
        map.addLayer({
          id: 'detection-labels',
          type: 'symbol',
          source: 'detections-source',
          minzoom: 14,
          filter: ['in', ['get', 'className'], ['literal', ['emergency_vehicle', 'suspicious_package']]],
          layout: {
            'text-field': ['upcase', ['get', 'className']],
            'text-font': ['Open Sans Regular'],
            'text-size': 9,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#ff4444',
            'text-halo-color': '#000',
            'text-halo-width': 1,
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
    const vis = layers.detections ? 'visible' : 'none';
    try {
      ['detection-glow', 'detection-circles', 'detection-labels'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
      });
    } catch {}
  }, [layers.detections, mapRef]);
}
