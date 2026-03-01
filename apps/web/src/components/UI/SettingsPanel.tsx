import { useState, useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore';

interface Settings {
  trailLength: number;
  refreshRate: number;
  units: 'nautical' | 'metric' | 'imperial';
  uiDensity: 'compact' | 'normal';
  showCoordinates: boolean;
  mapPitch: number;
  proximityRange: number;
}

const DEFAULT_SETTINGS: Settings = {
  trailLength: 20,
  refreshRate: 3,
  units: 'nautical',
  uiDensity: 'normal',
  showCoordinates: true,
  mapPitch: 45,
  proximityRange: 5,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('geo-settings');
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: Settings) {
  localStorage.setItem('geo-settings', JSON.stringify(settings));
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const alertsMuted = useMapStore((s) => s.alertsMuted);
  const toggleAlertsMuted = useMapStore((s) => s.toggleAlertsMuted);

  // Keyboard shortcut: comma to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ',' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  // Broadcast settings changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('settings-changed', { detail: settings }));
  }, [settings]);

  if (!open) {
    return (
      <button
        className="settings-gear"
        onClick={() => setOpen(true)}
        title="Settings (,)"
      >
        CFG
      </button>
    );
  }

  return (
    <div className="settings-overlay" onClick={() => setOpen(false)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">SYSTEM CONFIGURATION</span>
          <button className="settings-close" onClick={() => setOpen(false)}>X</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-section-title">DISPLAY</div>

            <div className="settings-row">
              <label className="settings-label">UI Density</label>
              <div className="settings-toggle-group">
                <button
                  className={`settings-toggle ${settings.uiDensity === 'compact' ? 'active' : ''}`}
                  onClick={() => update('uiDensity', 'compact')}
                >
                  COMPACT
                </button>
                <button
                  className={`settings-toggle ${settings.uiDensity === 'normal' ? 'active' : ''}`}
                  onClick={() => update('uiDensity', 'normal')}
                >
                  NORMAL
                </button>
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Units</label>
              <div className="settings-toggle-group">
                {(['nautical', 'metric', 'imperial'] as const).map((u) => (
                  <button
                    key={u}
                    className={`settings-toggle ${settings.units === u ? 'active' : ''}`}
                    onClick={() => update('units', u)}
                  >
                    {u === 'nautical' ? 'NM' : u === 'metric' ? 'KM' : 'MI'}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Show Coordinates</label>
              <button
                className={`settings-toggle ${settings.showCoordinates ? 'active' : ''}`}
                onClick={() => update('showCoordinates', !settings.showCoordinates)}
              >
                {settings.showCoordinates ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">DATA</div>

            <div className="settings-row">
              <label className="settings-label">Refresh Rate</label>
              <div className="settings-slider-row">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.refreshRate}
                  onChange={(e) => update('refreshRate', Number(e.target.value))}
                  className="settings-slider"
                />
                <span className="settings-slider-value">{settings.refreshRate}s</span>
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Trail Length</label>
              <div className="settings-slider-row">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={settings.trailLength}
                  onChange={(e) => update('trailLength', Number(e.target.value))}
                  className="settings-slider"
                />
                <span className="settings-slider-value">{settings.trailLength} pts</span>
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Proximity Range</label>
              <div className="settings-slider-row">
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={settings.proximityRange}
                  onChange={(e) => update('proximityRange', Number(e.target.value))}
                  className="settings-slider"
                />
                <span className="settings-slider-value">{settings.proximityRange} NM</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">MAP</div>

            <div className="settings-row">
              <label className="settings-label">Default Pitch</label>
              <div className="settings-slider-row">
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={settings.mapPitch}
                  onChange={(e) => update('mapPitch', Number(e.target.value))}
                  className="settings-slider"
                />
                <span className="settings-slider-value">{settings.mapPitch}deg</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">AUDIO</div>

            <div className="settings-row">
              <label className="settings-label">Alert Sounds</label>
              <button
                className={`settings-toggle ${!alertsMuted ? 'active' : ''}`}
                onClick={toggleAlertsMuted}
              >
                {alertsMuted ? 'MUTED' : 'ON'}
              </button>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <span className="settings-hint">Press , to toggle | ESC to close</span>
          <button
            className="settings-reset"
            onClick={() => {
              setSettings({ ...DEFAULT_SETTINGS });
              saveSettings(DEFAULT_SETTINGS);
            }}
          >
            RESET DEFAULTS
          </button>
        </div>
      </div>
    </div>
  );
}
