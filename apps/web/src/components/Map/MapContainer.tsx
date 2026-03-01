import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../store/useMapStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useAircraftLayer } from './useAircraftLayer';
import { useGeofenceLayer } from './useGeofenceLayer';
import { useCameraLayer } from './useCameraLayer';
import { useDetectionLayer } from './useDetectionLayer';
import { useHeatmapLayer } from './useHeatmapLayer';
import { useBuildingLayer } from './useBuildingLayer';
import { useGridOverlay } from './useGridOverlay';
import { useRangeRings } from './useRangeRings';
import { useProximityLayer } from './useProximityLayer';

const BASEMAP_TILES: Record<string, string[]> = {
  dark: [
    'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
  ],
  voyager: [
    'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
  ],
  satellite: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ],
};

export function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoaded = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const measureSourceAdded = useRef(false);

  const { center, zoom, bearing, pitch, setSelectedAircraft, selectedAircraft, flyToTarget, clearFlyTo } = useMapStore();
  const basemap = useMapStore((s) => s.basemap);
  const activeTool = useMapStore((s) => s.activeTool);
  const addMeasurePoint = useMapStore((s) => s.addMeasurePoint);
  const measurePoints = useMapStore((s) => s.measurePoints);

  useAircraftLayer(mapRef, mapLoaded);
  useGeofenceLayer(mapRef, mapLoaded);
  useCameraLayer(mapRef, mapLoaded);
  useDetectionLayer(mapRef, mapLoaded);
  useHeatmapLayer(mapRef, mapLoaded);
  useBuildingLayer(mapRef, mapLoaded);
  useGridOverlay(mapRef, mapLoaded);
  useRangeRings(mapRef, mapLoaded);
  useProximityLayer(mapRef, mapLoaded);

  // Basemap switching
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded.current) return;

    const source = map.getSource('osm-tiles') as maplibregl.RasterTileSource | undefined;
    if (source && typeof source.setTiles === 'function') {
      source.setTiles(BASEMAP_TILES[basemap] || BASEMAP_TILES.dark);
    }
  }, [basemap]);

  // Measurement tool - draw line between points
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded.current) return;

    // Initialize measure source/layers once
    if (!measureSourceAdded.current && !map.getSource('measure-source')) {
      map.addSource('measure-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'measure-line',
        type: 'line',
        source: 'measure-source',
        paint: {
          'line-color': '#ff00ff',
          'line-width': 2,
          'line-dasharray': [4, 4],
        },
      });

      map.addLayer({
        id: 'measure-points',
        type: 'circle',
        source: 'measure-source',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#ff00ff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });

      measureSourceAdded.current = true;
    }

    // Update measure source data
    try {
      const source = map.getSource('measure-source') as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const features: any[] = [];

      // Add points
      for (const pt of measurePoints) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: pt.lngLat },
          properties: {},
        });
      }

      // Add line if 2 points
      if (measurePoints.length === 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: measurePoints.map((p) => p.lngLat),
          },
          properties: {},
        });
      }

      source.setData({ type: 'FeatureCollection', features } as any);
    } catch {}
  }, [measurePoints]);

  // Fly-to when target changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;

    map.flyTo({
      center: flyToTarget.center,
      zoom: flyToTarget.zoom || 13,
      duration: 1500,
      essential: true,
    });
    clearFlyTo();
  }, [flyToTarget, clearFlyTo]);

  // Fly-to selected aircraft
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedAircraft) return;

    const aircraft = useTelemetryStore.getState().aircraft;
    const ac = aircraft.get(selectedAircraft);
    if (ac) {
      map.flyTo({
        center: [ac.longitude, ac.latitude],
        zoom: Math.max(map.getZoom(), 11),
        duration: 1200,
        essential: true,
      });
    }
  }, [selectedAircraft]);

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
      preserveDrawingBuffer: true,
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
      // Skip if measuring
      if (useMapStore.getState().activeTool === 'measure') return;
      if (e.features && e.features.length > 0) {
        const icao24 = e.features[0].properties?.icao24;
        if (icao24) {
          setSelectedAircraft(icao24);
        }
      }
    });

    // Click on empty space deselects
    map.on('click', (e) => {
      // Skip if measuring
      if (useMapStore.getState().activeTool === 'measure') return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['aircraft-symbols'],
      });
      if (!features.length) {
        setSelectedAircraft(null);
      }
    });

    // Hover popup for aircraft
    map.on('mouseenter', 'aircraft-symbols', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties;
        if (!props) return;

        const vs = Number(props.verticalRate);
        const vsIcon = vs > 100 ? 'CLIMB' : vs < -100 ? 'DESC' : 'LEVEL';
        const html = `
          <div class="aircraft-popup">
            <div class="popup-callsign">${props.callsign || 'UNKNOWN'}</div>
            <div class="popup-row">ALT ${Number(props.altitude).toLocaleString()} ft</div>
            <div class="popup-row">HDG ${Number(props.heading).toFixed(0)} | SPD ${props.velocity} kts</div>
            <div class="popup-row">SQK ${props.squawk} | ${vsIcon}</div>
          </div>
        `;

        if (popupRef.current) popupRef.current.remove();

        const coords = (e.features[0].geometry as any).coordinates.slice();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'tactical-popup',
          offset: 15,
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      }
    });

    map.on('mouseleave', 'aircraft-symbols', () => {
      map.getCanvas().style.cursor = '';
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    });

    // Camera hover popup
    map.on('mouseenter', 'camera-symbols', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties;
        if (!props) return;

        const html = `
          <div class="aircraft-popup">
            <div class="popup-callsign" style="color: #44aaff;">${props.name || props.cameraId}</div>
            <div class="popup-row">ID: ${props.cameraId}</div>
            <div class="popup-row">STATUS: ${(props.status || 'active').toUpperCase()}</div>
          </div>
        `;

        if (popupRef.current) popupRef.current.remove();
        const coords = (e.features[0].geometry as any).coordinates.slice();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'tactical-popup',
          offset: 15,
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      }
    });

    map.on('mouseleave', 'camera-symbols', () => {
      map.getCanvas().style.cursor = '';
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    });

    // Measurement tool click handler
    map.on('click', (e) => {
      const tool = useMapStore.getState().activeTool;
      if (tool === 'measure') {
        useMapStore.getState().addMeasurePoint({
          lngLat: [e.lngLat.lng, e.lngLat.lat],
        });
        return; // Don't trigger other click handlers when measuring
      }
    });

    // Emit mouse coordinates for the coordinate display
    map.on('mousemove', (e) => {
      window.dispatchEvent(
        new CustomEvent('map-mousemove', {
          detail: { lat: e.lngLat.lat, lng: e.lngLat.lng },
        })
      );
    });

    // Emit bearing changes for compass
    map.on('rotate', () => {
      window.dispatchEvent(
        new CustomEvent('map-bearing', {
          detail: { bearing: map.getBearing() },
        })
      );
    });

    mapRef.current = map;

    // Expose map for debugging
    (window as any).__map = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoaded.current = false;
      delete (window as any).__map;
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
