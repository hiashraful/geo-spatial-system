import { useState, useEffect, useRef } from 'react';

interface Coords {
  lat: number;
  lng: number;
}

export function CoordinateDisplay() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mgrs, setMgrs] = useState('');

  useEffect(() => {
    // Listen for custom coordinate events from the map
    const handler = (e: CustomEvent<Coords>) => {
      setCoords(e.detail);
      // Simple MGRS approximation (just show decimal degrees with direction)
      const lat = e.detail.lat;
      const lng = e.detail.lng;
      const latDir = lat >= 0 ? 'N' : 'S';
      const lngDir = lng >= 0 ? 'E' : 'W';
      setMgrs(`${Math.abs(lat).toFixed(4)}${latDir} ${Math.abs(lng).toFixed(4)}${lngDir}`);
    };

    window.addEventListener('map-mousemove' as any, handler);
    return () => window.removeEventListener('map-mousemove' as any, handler);
  }, []);

  if (!coords) return null;

  return (
    <div className="coordinate-display">
      <span className="coord-label">CURSOR</span>
      <span className="coord-value">{mgrs}</span>
    </div>
  );
}
