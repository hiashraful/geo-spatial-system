import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../store/useMapStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useAircraftLayer } from './useAircraftLayer';
import { useGeofenceLayer } from './useGeofenceLayer';
import { useCameraLayer } from './useCameraLayer';
import { useDetectionLayer } from './useDetectionLayer';

export function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoaded = useRef(false);

  const { center, zoom, bearing, pitch, layers, setSelectedAircraft } = useMapStore();

  useAircraftLayer(mapRef, mapLoaded);
  useGeofenceLayer(mapRef, mapLoaded);
  useCameraLayer(mapRef, mapLoaded);
  useDetectionLayer(mapRef, mapLoaded);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'Tactical Dark',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      },
      center: center,
      zoom: zoom,
      bearing: bearing,
      pitch: pitch,
      maxZoom: 18,
      minZoom: 3,
      antialias: true,
    });

    // Navigation controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'nautical' }), 'bottom-left');

    map.on('load', () => {
      mapLoaded.current = true;
      console.log('[Map] Loaded');
    });

    // Click handler for aircraft
    map.on('click', 'aircraft-symbols', (e) => {
      if (e.features && e.features.length > 0) {
        const icao24 = e.features[0].properties?.icao24;
        if (icao24) {
          setSelectedAircraft(icao24);
        }
      }
    });

    // Click on empty space deselects
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['aircraft-symbols'],
      });
      if (!features.length) {
        setSelectedAircraft(null);
      }
    });

    // Cursor changes
    map.on('mouseenter', 'aircraft-symbols', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'aircraft-symbols', () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoaded.current = false;
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    />
  );
}
