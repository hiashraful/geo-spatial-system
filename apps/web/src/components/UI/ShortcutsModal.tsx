import { useEffect, useState } from 'react';

const SHORTCUTS = [
  { key: '1', action: 'Toggle Aircraft layer' },
  { key: '2', action: 'Toggle Trails layer' },
  { key: '3', action: 'Toggle Geofences layer' },
  { key: '4', action: 'Toggle Cameras layer' },
  { key: '5', action: 'Toggle Detections layer' },
  { key: '6', action: 'Toggle Heatmap layer' },
  { key: '7', action: 'Toggle 3D Buildings layer' },
  { key: '8', action: 'Toggle Grid / Range Rings' },
  { key: 'M', action: 'Toggle Measure tool' },
  { key: 'Esc', action: 'Cancel tool / Deselect aircraft' },
  { key: '/', action: 'Open search dialog' },
  { key: '?', action: 'Show this help' },
  { key: 'Ctrl+Shift+S', action: 'Screen capture' },
];

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="shortcuts-overlay" onClick={() => setOpen(false)}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <span className="shortcuts-title">KEYBOARD SHORTCUTS</span>
          <button className="shortcuts-close" onClick={() => setOpen(false)}>
            X
          </button>
        </div>
        <div className="shortcuts-body">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="shortcut-row">
              <kbd className="shortcut-key">{s.key}</kbd>
              <span className="shortcut-action">{s.action}</span>
            </div>
          ))}
        </div>
        <div className="shortcuts-footer">
          Press <kbd className="shortcut-key-inline">?</kbd> to close
        </div>
      </div>
    </div>
  );
}
