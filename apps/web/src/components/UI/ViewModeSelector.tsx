import { useMapStore } from '../../store/useMapStore';
import type { ViewMode } from '../../store/useMapStore';

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'normal', label: 'STD' },
  { id: 'nv', label: 'NV' },
  { id: 'ir', label: 'IR' },
];

export function ViewModeSelector() {
  const viewMode = useMapStore((s) => s.viewMode);
  const setViewMode = useMapStore((s) => s.setViewMode);

  return (
    <div className="viewmode-selector">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`viewmode-btn ${viewMode === m.id ? 'active' : ''} ${m.id}`}
          onClick={() => setViewMode(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
