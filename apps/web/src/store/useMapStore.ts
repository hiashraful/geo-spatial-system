import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayerVisibility {
  aircraft: boolean;
  trails: boolean;
  geofences: boolean;
  cameras: boolean;
  detections: boolean;
  heatmap: boolean;
}

interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  layers: LayerVisibility;
  selectedAircraft: string | null;
  selectedCamera: string | null;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setView: (center: [number, number], zoom: number) => void;
  setBearing: (bearing: number) => void;
  setPitch: (pitch: number) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setSelectedAircraft: (icao24: string | null) => void;
  setSelectedCamera: (cameraId: string | null) => void;
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
      },
      selectedAircraft: null,
      selectedCamera: null,
      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setView: (center, zoom) => set({ center, zoom }),
      setBearing: (bearing) => set({ bearing }),
      setPitch: (pitch) => set({ pitch }),
      toggleLayer: (layer) =>
        set((state) => ({
          layers: { ...state.layers, [layer]: !state.layers[layer] },
        })),
      setSelectedAircraft: (icao24) => set({ selectedAircraft: icao24 }),
      setSelectedCamera: (cameraId) => set({ selectedCamera: cameraId }),
    }),
    {
      name: 'geo-map-state',
      partialize: (state) => ({ layers: state.layers }),
    }
  )
);
