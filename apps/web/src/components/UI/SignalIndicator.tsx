import { useTelemetryStore } from '../../store/useTelemetryStore';

export function SignalIndicator() {
  const connected = useTelemetryStore((s) => s.wsConnected);
  const latency = useTelemetryStore((s) => s.wsLatency);
  const msgRate = useTelemetryStore((s) => s.msgRate);

  // Signal quality: 4 bars based on connection and latency
  const bars = connected ? (latency === 0 ? 3 : latency < 50 ? 4 : latency < 150 ? 3 : latency < 500 ? 2 : 1) : 0;
  const color = bars >= 3 ? '#00ff88' : bars >= 2 ? '#ffaa00' : '#ff4444';

  return (
    <div className="signal-indicator">
      <div className="signal-bars">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="signal-bar"
            style={{
              height: `${level * 3 + 2}px`,
              background: level <= bars ? color : '#1a2332',
              boxShadow: level <= bars ? `0 0 4px ${color}44` : 'none',
            }}
          />
        ))}
      </div>
      <div className="signal-info">
        <span className="signal-rate" style={{ color: connected ? '#8b949e' : '#ff4444' }}>
          {connected ? `${msgRate}/s` : 'N/C'}
        </span>
        {connected && latency > 0 && (
          <span className="signal-latency" style={{ color }}>
            {latency}ms
          </span>
        )}
      </div>
    </div>
  );
}
