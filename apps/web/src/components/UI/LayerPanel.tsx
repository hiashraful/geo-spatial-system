import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useMapStore } from '../../store/useMapStore';

const LAYER_CONFIG = [
  { key: 'aircraft' as const, label: 'AIRCRAFT', icon: 'A' },
  { key: 'trails' as const, label: 'TRAILS', icon: 'T' },
  { key: 'geofences' as const, label: 'GEOFENCES', icon: 'G' },
  { key: 'cameras' as const, label: 'CAMERAS', icon: 'C' },
  { key: 'detections' as const, label: 'DETECTIONS', icon: 'D' },
  { key: 'heatmap' as const, label: 'HEATMAP', icon: 'H' },
];

export function LayerPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const { layers, toggleLayer } = useMapStore();

  return (
    <motion.div
      initial={{ x: -200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="layer-panel"
    >
      <div className="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="panel-title">LAYERS</span>
        <span className="panel-toggle">{collapsed ? '+' : '-'}</span>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="panel-body"
          >
            {LAYER_CONFIG.map(({ key, label, icon }) => (
              <div
                key={key}
                className={`layer-item ${layers[key] ? 'active' : ''}`}
                onClick={() => toggleLayer(key)}
              >
                <span className="layer-icon">{icon}</span>
                <span className="layer-label">{label}</span>
                <span className={`layer-indicator ${layers[key] ? 'on' : 'off'}`} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
