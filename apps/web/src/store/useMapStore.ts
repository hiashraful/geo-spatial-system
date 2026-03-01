import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayerVisibility {
  aircraft: boolean;
  trails: boolean;
  geofences: boolean;
  cameras: boolean;
  detections: boolean;
  heatmap: boolean;
  buildings: boolean;
  grid: boolean;
}

export type BasemapStyle = 'dark' | 'voyager' | 'satellite';
export type ActiveTool = 'none' | 'measure';
export type ViewMode = 'normal' | 'nv' | 'ir';

interface FlyToTarget {
  center: [number, number];
  zoom?: number;
}

export interface MeasurePoint {
  lngLat: [number, number];
}

interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  layers: LayerVisibility;
  basemap: BasemapStyle;
  activeTool: ActiveTool;
  viewMode: ViewMode;
  measurePoints: MeasurePoint[];
  selectedAircraft: string | null;
  selectedCamera: string | null;
  flyToTarget: FlyToTarget | null;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setView: (center: [number, number], zoom: number) => void;
  setBearing: (bearing: number) => void;
  setPitch: (pitch: number) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setBasemap: (basemap: BasemapStyle) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setViewMode: (mode: ViewMode) => void;
  addMeasurePoint: (point: MeasurePoint) => void;
  clearMeasurePoints: () => void;
  setSelectedAircraft: (icao24: string | null) => void;
  setSelectedCamera: (cameraId: string | null) => void;
  flyTo: (center: [number, number], zoom?: number) => void;
  clearFlyTo: () => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      center: [-74.006, 40.7128],
      zoom: 10,
      bearing: 0,
      pitch: 45,
      layers: {
        aircraft: true,
        trails: true,
        geofences: true,
        cameras: true,
        detections: true,
        heatmap: false,
        buildings: true,
        grid: false,
      },
      basemap: 'dark' as BasemapStyle,
      activeTool: 'none' as ActiveTool,
      viewMode: 'normal' as ViewMode,
      measurePoints: [],
      selectedAircraft: null,
      selectedCamera: null,
      flyToTarget: null,
      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setView: (center, zoom) => set({ center, zoom }),
      setBearing: (bearing) => set({ bearing }),
      setPitch: (pitch) => set({ pitch }),
      toggleLayer: (layer) =>
        set((state) => ({
          layers: { ...state.layers, [layer]: !state.layers[layer] },
        })),
      setBasemap: (basemap) => set({ basemap }),
      setActiveTool: (tool) => set({ activeTool: tool, measurePoints: [] }),
      setViewMode: (mode) => set({ viewMode: mode }),
      addMeasurePoint: (point) =>
        set((state) => ({
          measurePoints: [...state.measurePoints.slice(-1), point],
        })),
      clearMeasurePoints: () => set({ measurePoints: [] }),
      setSelectedAircraft: (icao24) => set({ selectedAircraft: icao24 }),
      setSelectedCamera: (cameraId) => set({ selectedCamera: cameraId }),
      flyTo: (center, zoom) => set({ flyToTarget: { center, zoom } }),
      clearFlyTo: () => set({ flyToTarget: null }),
    }),
    {
      name: 'geo-map-state',
      partialize: (state) => ({ layers: state.layers, basemap: state.basemap }),
    }
  )
);
