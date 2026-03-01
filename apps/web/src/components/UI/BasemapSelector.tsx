import { useMapStore } from '../../store/useMapStore';
import type { BasemapStyle } from '../../store/useMapStore';

const BASEMAP_OPTIONS: { key: BasemapStyle; label: string; shortcut: string }[] = [
  { key: 'dark', label: 'DARK', shortcut: 'D' },
  { key: 'voyager', label: 'VOYAGER', shortcut: 'V' },
  { key: 'satellite', label: 'SAT', shortcut: 'S' },
];

export function BasemapSelector() {
  const basemap = useMapStore((s) => s.basemap);
  const setBasemap = useMapStore((s) => s.setBasemap);

  return (
    <div className="basemap-selector">
      {BASEMAP_OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          className={`basemap-btn ${basemap === key ? 'active' : ''}`}
          onClick={() => setBasemap(key)}
          title={`Switch to ${label} basemap`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
