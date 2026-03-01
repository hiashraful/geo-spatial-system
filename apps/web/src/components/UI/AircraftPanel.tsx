import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import type { AircraftData } from '../../store/useTelemetryStore';
import { useMapStore } from '../../store/useMapStore';
import { AircraftGauge } from './AircraftGauge';

export function AircraftPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<'callsign' | 'altitude' | 'velocity'>('altitude');
  const [filter, setFilter] = useState('');

  const aircraft = useTelemetryStore((s) => s.aircraft);
  const selectedAircraft = useMapStore((s) => s.selectedAircraft);
  const setSelectedAircraft = useMapStore((s) => s.setSelectedAircraft);
  const flyTo = useMapStore((s) => s.flyTo);

  const sortedAircraft = useMemo(() => {
    let list = Array.from(aircraft.values());

    if (filter) {
      const f = filter.toUpperCase();
      list = list.filter(
        (ac) =>
          ac.callsign.includes(f) ||
          ac.icao24.includes(f.toLowerCase()) ||
          ac.squawk.includes(f)
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'callsign':
          return a.callsign.localeCompare(b.callsign);
        case 'altitude':
          return b.altitude - a.altitude;
        case 'velocity':
          return b.velocity - a.velocity;
        default:
          return 0;
      }
    });

    return list;
  }, [aircraft, sortBy, filter]);

  const selectedData = selectedAircraft ? aircraft.get(selectedAircraft) : null;

  const handleFlyTo = (ac: AircraftData) => {
    setSelectedAircraft(ac.icao24);
    flyTo([ac.longitude, ac.latitude], 13);
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="aircraft-panel"
    >
      <div className="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="panel-title">AIRCRAFT TRACKS ({aircraft.size})</span>
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
            {/* Selected aircraft detail */}
            {selectedData && (
              <div className="aircraft-detail">
                <div className="detail-header">
                  <span className="detail-callsign">{selectedData.callsign}</span>
                  <span className="detail-icao">{selectedData.icao24}</span>
                  <button
                    className="detail-flyto"
                    onClick={() => handleFlyTo(selectedData)}
                    title="Fly to aircraft"
                  >
                    FLY
                  </button>
                  <button
                    className="detail-close"
                    onClick={() => setSelectedAircraft(null)}
                  >
                    x
                  </button>
                </div>
                <div className="detail-grid">
                  <DetailItem label="ALT" value={`${selectedData.altitude.toLocaleString()} ft`} />
                  <DetailItem label="HDG" value={`${selectedData.heading.toFixed(1)}deg`} />
                  <DetailItem label="SPD" value={`${selectedData.velocity} kts`} />
                  <DetailItem label="VS" value={`${selectedData.verticalRate > 0 ? '+' : ''}${selectedData.verticalRate} fpm`} />
                  <DetailItem label="SQK" value={selectedData.squawk} highlight={selectedData.squawk === '7700' || selectedData.squawk === '7600' || selectedData.squawk === '7500'} />
                  <DetailItem label="LAT" value={selectedData.latitude.toFixed(4)} />
                  <DetailItem label="LON" value={selectedData.longitude.toFixed(4)} />
                  <DetailItem label="CAT" value={selectedData.category} />
                </div>
                <div className="detail-gauges">
                  <AircraftGauge
                    value={selectedData.altitude}
                    max={45000}
                    label="ALTITUDE"
                    unit="ft"
                    color="#44aaff"
                    width={88}
                    height={44}
                  />
                  <AircraftGauge
                    value={selectedData.velocity}
                    max={600}
                    label="SPEED"
                    unit="kt"
                    color="#00ff88"
                    width={88}
                    height={44}
                  />
                  <AircraftGauge
                    value={Math.abs(selectedData.verticalRate)}
                    max={3000}
                    label="V/S RATE"
                    unit="fpm"
                    color={selectedData.verticalRate > 0 ? '#00ff88' : selectedData.verticalRate < 0 ? '#ffaa00' : '#8b949e'}
                    width={88}
                    height={44}
                  />
                </div>
                {selectedData.trail && selectedData.trail.length > 0 && (
                  <div className="detail-trail-info">
                    TRAIL: {selectedData.trail.length} POSITIONS TRACKED
                  </div>
                )}
              </div>
            )}

            {/* Filter and sort */}
            <div className="list-controls">
              <div className="filter-wrapper">
                <input
                  className="filter-input"
                  placeholder="FILTER..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                {filter && (
                  <span className="filter-count">{sortedAircraft.length}/{aircraft.size}</span>
                )}
              </div>
              <div className="sort-buttons">
                {(['callsign', 'altitude', 'velocity'] as const).map((s) => (
                  <button
                    key={s}
                    className={`sort-btn ${sortBy === s ? 'active' : ''}`}
                    onClick={() => setSortBy(s)}
                  >
                    {s.substring(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Aircraft list */}
            <div className="aircraft-list">
              {sortedAircraft.slice(0, 30).map((ac) => (
                <div
                  key={ac.icao24}
                  className={`aircraft-row ${selectedAircraft === ac.icao24 ? 'selected' : ''} ${ac.squawk === '7700' ? 'emergency' : ''}`}
                  onClick={() => handleFlyTo(ac)}
                >
                  <span className="ac-callsign">{ac.callsign || '------'}</span>
                  <span className="ac-altitude">FL{Math.round(ac.altitude / 100)}</span>
                  <span className="ac-speed">{ac.velocity}kt</span>
                  <span className={`ac-vs ${ac.verticalRate > 100 ? 'climbing' : ac.verticalRate < -100 ? 'descending' : ''}`}>
                    {ac.verticalRate > 100 ? '^' : ac.verticalRate < -100 ? 'v' : '-'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`detail-item ${highlight ? 'highlight' : ''}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}
