import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/useMapStore';

function createCameraIcon(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <rect x="2" y="6" width="16" height="12" rx="2" fill="#2299ff" stroke="#001122" stroke-width="0.5" opacity="0.9"/>
    <polygon points="18,8 23,5 23,19 18,16" fill="#2299ff" stroke="#001122" stroke-width="0.5" opacity="0.9"/>
    <circle cx="10" cy="12" r="3" fill="#001122" opacity="0.6"/>
    <circle cx="10" cy="12" r="1.5" fill="#66ccff" opacity="0.8"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function useCameraLayer(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapLoaded: MutableRefObject<boolean>
) {
  const initialized = useRef(false);
  const layers = useMapStore((s) => s.layers);
  const setSelectedCamera = useMapStore((s) => s.setSelectedCamera);

  useEffect(() => {
    if (initialized.current) return;

    const checkReady = setInterval(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded.current) return;

      initialized.current = true;
      clearInterval(checkReady);

      const img = new Image(24, 24);
      img.onload = () => {
        if (!map.hasImage('camera-icon')) {
          map.addImage('camera-icon', img, { sdf: false });
        }

        fetch('http://localhost:3001/api/cameras')
          .then((r) => r.json())
          .then(({ cameras }) => {
            const geojson = {
              type: 'FeatureCollection',
              features: cameras.map((cam: any) => ({
                type: 'Feature',
                properties: { cameraId: cam.camera_id, name: cam.name, status: cam.status },
                geometry: { type: 'Point', coordinates: [cam.longitude, cam.latitude] },
              })),
            };

            if (!map.getSource('cameras-source')) {
              map.addSource('cameras-source', { type: 'geojson', data: geojson as any });
            }

            if (!map.getLayer('camera-pulse')) {
              map.addLayer({
                id: 'camera-pulse',
                type: 'circle',
                source: 'cameras-source',
                paint: {
                  'circle-radius': 12,
                  'circle-color': '#2299ff',
                  'circle-opacity': 0.15,
                  'circle-stroke-color': '#2299ff',
                  'circle-stroke-width': 1,
                  'circle-stroke-opacity': 0.3,
                },
              });
            }

            if (!map.getLayer('camera-symbols')) {
              map.addLayer({
                id: 'camera-symbols',
                type: 'symbol',
                source: 'cameras-source',
                layout: {
                  'icon-image': 'camera-icon',
                  'icon-size': 0.9,
                  'icon-allow-overlap': true,
                  'text-field': ['get', 'name'],
                  'text-font': ['Open Sans Regular'],
                  'text-size': 9,
                  'text-offset': [0, 1.5],
                  'text-anchor': 'top',
                },
                paint: {
                  'text-color': '#66aaff',
                  'text-halo-color': '#000',
                  'text-halo-width': 1,
                },
              });
            }

            map.on('click', 'camera-symbols', (e) => {
              if (e.features?.[0]?.properties?.cameraId) {
                setSelectedCamera(e.features[0].properties.cameraId);
              }
            });
            map.on('mouseenter', 'camera-symbols', () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', 'camera-symbols', () => { map.getCanvas().style.cursor = ''; });

            console.log('[Camera] Layers initialized');
          })
          .catch((err) => console.warn('[Camera] Load error:', err.message));
      };
      img.src = createCameraIcon();
    }, 250);

    return () => clearInterval(checkReady);
  }, [mapRef, mapLoaded, setSelectedCamera]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = layers.cameras ? 'visible' : 'none';
    try {
      ['camera-pulse', 'camera-symbols'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
      });
    } catch {}
  }, [layers.cameras, mapRef]);
}
