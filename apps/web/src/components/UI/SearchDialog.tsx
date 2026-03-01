import { useEffect, useRef, useState } from 'react';
import { useMapStore } from '../../store/useMapStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';

const PRESETS = [
  { name: 'JFK Airport', lat: 40.6413, lng: -73.7781, zoom: 13 },
  { name: 'LaGuardia Airport', lat: 40.7769, lng: -73.8740, zoom: 13 },
  { name: 'Newark Airport', lat: 40.6895, lng: -74.1745, zoom: 13 },
  { name: 'Manhattan', lat: 40.7580, lng: -73.9855, zoom: 13 },
  { name: 'Brooklyn Bridge', lat: 40.7061, lng: -73.9969, zoom: 15 },
  { name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445, zoom: 15 },
  { name: 'Central Park', lat: 40.7829, lng: -73.9654, zoom: 14 },
  { name: 'Times Square', lat: 40.7580, lng: -73.9855, zoom: 16 },
  { name: 'World Trade Center', lat: 40.7127, lng: -74.0134, zoom: 16 },
  { name: 'Teterboro Airport', lat: 40.8501, lng: -74.0608, zoom: 13 },
];

function parseCoordinates(input: string): { lat: number; lng: number } | null {
  // Try "lat, lng" format
  const parts = input.split(/[,\s]+/).filter(Boolean);
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const flyTo = useMapStore((s) => s.flyTo);
  const setSelectedAircraft = useMapStore((s) => s.setSelectedAircraft);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '/') {
        e.preventDefault();
        setOpen(true);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (lat: number, lng: number, zoom?: number) => {
    flyTo([lng, lat], zoom || 13);
    setOpen(false);
  };

  const handleAircraftSelect = (icao24: string) => {
    setSelectedAircraft(icao24);
    setOpen(false);
  };

  // Filter results
  const q = query.toLowerCase().trim();
  const coords = parseCoordinates(query);

  const matchedPresets = q
    ? PRESETS.filter((p) => p.name.toLowerCase().includes(q))
    : PRESETS;

  // Search aircraft by callsign or ICAO
  const aircraft = useTelemetryStore.getState().aircraft;
  const matchedAircraft: Array<{ icao24: string; callsign: string; altitude: number }> = [];
  if (q.length >= 2) {
    for (const [icao24, ac] of aircraft.entries()) {
      if (
        icao24.toLowerCase().includes(q) ||
        (ac.callsign && ac.callsign.toLowerCase().includes(q))
      ) {
        matchedAircraft.push({ icao24, callsign: ac.callsign, altitude: ac.altitude });
        if (matchedAircraft.length >= 10) break;
      }
    }
  }

  if (!open) return null;

  return (
    <div className="search-overlay" onClick={() => setOpen(false)}>
      <div className="search-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <span className="search-icon">/</span>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search location, aircraft, or enter coordinates..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && coords) {
                handleSelect(coords.lat, coords.lng, 14);
              }
            }}
          />
        </div>

        <div className="search-results">
          {coords && (
            <div className="search-section">
              <div className="search-section-label">COORDINATES</div>
              <div
                className="search-result-item"
                onClick={() => handleSelect(coords.lat, coords.lng, 14)}
              >
                <span className="result-icon coord-icon">+</span>
                <span className="result-name">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
                <span className="result-hint">GO TO</span>
              </div>
            </div>
          )}

          {matchedAircraft.length > 0 && (
            <div className="search-section">
              <div className="search-section-label">AIRCRAFT</div>
              {matchedAircraft.map((ac) => (
                <div
                  key={ac.icao24}
                  className="search-result-item"
                  onClick={() => handleAircraftSelect(ac.icao24)}
                >
                  <span className="result-icon ac-icon">A</span>
                  <span className="result-name">{ac.callsign || ac.icao24}</span>
                  <span className="result-meta">
                    FL{Math.round(ac.altitude / 100)} | {ac.icao24}
                  </span>
                </div>
              ))}
            </div>
          )}

          {matchedPresets.length > 0 && (
            <div className="search-section">
              <div className="search-section-label">LOCATIONS</div>
              {matchedPresets.map((p) => (
                <div
                  key={p.name}
                  className="search-result-item"
                  onClick={() => handleSelect(p.lat, p.lng, p.zoom)}
                >
                  <span className="result-icon loc-icon">*</span>
                  <span className="result-name">{p.name}</span>
                  <span className="result-meta">
                    {p.lat.toFixed(2)}, {p.lng.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {q && !coords && matchedPresets.length === 0 && matchedAircraft.length === 0 && (
            <div className="search-empty">No results for "{query}"</div>
          )}
        </div>

        <div className="search-footer">
          <span>ESC to close</span>
          <span>ENTER to go</span>
          <span>/ to search</span>
        </div>
      </div>
    </div>
  );
}
