import { useEffect, useState, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

interface TickerMessage {
  id: string;
  type: 'notam' | 'alert' | 'info' | 'warning';
  text: string;
  timestamp: number;
}

const NOTAM_TEMPLATES = [
  'NOTAM A{n}/26: TFR ACTIVE R-{zone} SFC-FL180 EFF {time}Z',
  'SIGMET TANGO {n}: MOD TURB FCST FL250-FL400 AREA {area}',
  'ATIS INFO {letter}: WND {dir}/{spd}KT VIS 10SM FEW250 A{alt}',
  'PIREP UA /OV {fix}/TM {time}/FL{fl}/TP B738/TB MOD',
  'METAR KJFK {time}Z {dir}{spd}KT {vis}SM SCT{ceil} A{alt}',
  'NOV ADVISORY: INCREASED DRONE ACTIVITY REPORTED {area} SECTOR',
  'ATC FLOW: GND STOP {airport} UNTIL {time}Z DUE WX',
  'MIL NOTAM: RESTRICTED AREA R-{zone} HOT FL180-UNL',
];

function generateNotam(): string {
  const tmpl = NOTAM_TEMPLATES[Math.floor(Math.random() * NOTAM_TEMPLATES.length)];
  const now = new Date();
  const time = `${now.getUTCHours().toString().padStart(2, '0')}${now.getUTCMinutes().toString().padStart(2, '0')}`;
  const areas = ['NE', 'SW', 'NORTH', 'SOUTH', 'CENTRAL', 'EAST'];
  const airports = ['KJFK', 'KLGA', 'KEWR', 'KTEB'];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fixes = ['JFK', 'LGA', 'EWR', 'HPN', 'ISP', 'SWF'];

  return tmpl
    .replace('{n}', String(Math.floor(Math.random() * 9000) + 1000))
    .replace('{zone}', String(Math.floor(Math.random() * 900) + 100))
    .replace('{time}', time)
    .replace('{area}', areas[Math.floor(Math.random() * areas.length)])
    .replace('{letter}', letters[Math.floor(Math.random() * 26)])
    .replace('{dir}', String(Math.floor(Math.random() * 36) * 10).padStart(3, '0'))
    .replace('{spd}', String(Math.floor(Math.random() * 25) + 5))
    .replace('{vis}', String(Math.floor(Math.random() * 10) + 1))
    .replace('{ceil}', String(Math.floor(Math.random() * 200) + 20).padStart(3, '0'))
    .replace('{alt}', String(Math.floor(Math.random() * 10) + 2990))
    .replace('{fl}', String(Math.floor(Math.random() * 300) + 100))
    .replace('{fix}', fixes[Math.floor(Math.random() * fixes.length)])
    .replace('{airport}', airports[Math.floor(Math.random() * airports.length)]);
}

export function AlertTicker() {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);
  const prevAlertCount = useRef(0);

  // Initialize with some NOTAMs
  useEffect(() => {
    const initial: TickerMessage[] = [];
    for (let i = 0; i < 4; i++) {
      initial.push({
        id: `notam-init-${i}`,
        type: i === 0 ? 'info' : 'notam',
        text: generateNotam(),
        timestamp: Date.now() - i * 60000,
      });
    }
    setMessages(initial);
  }, []);

  // Add periodic NOTAMs
  useEffect(() => {
    const iv = setInterval(() => {
      setMessages((prev) => {
        const next = [
          {
            id: `notam-${Date.now()}`,
            type: 'notam' as const,
            text: generateNotam(),
            timestamp: Date.now(),
          },
          ...prev,
        ].slice(0, 12);
        return next;
      });
    }, 30000); // New NOTAM every 30 seconds

    return () => clearInterval(iv);
  }, []);

  // Add geofence alerts as they come in
  useEffect(() => {
    if (geofenceAlerts.length > prevAlertCount.current && geofenceAlerts.length > 0) {
      const latest = geofenceAlerts[0];
      const zones = latest.violations.map((v) => v.name).join(', ');
      setMessages((prev) => [
        {
          id: `alert-${Date.now()}`,
          type: 'alert',
          text: `GEOFENCE BREACH: ${latest.aircraft.callsign} (${latest.aircraft.icao24.toUpperCase()}) VIOLATED ${zones} AT FL${Math.round(latest.aircraft.altitude / 100)} HDG ${latest.aircraft.heading.toFixed(0)}`,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 12));
    }
    prevAlertCount.current = geofenceAlerts.length;
  }, [geofenceAlerts]);

  const tickerText = messages.map((m) => {
    const prefix = m.type === 'alert' ? '*** ' : m.type === 'warning' ? '!! ' : '// ';
    return `${prefix}${m.text}`;
  }).join('     ');

  return (
    <div className="alert-ticker">
      <span className="ticker-label">NOTAM</span>
      <div className="ticker-track" ref={tickerRef}>
        <div className="ticker-content">
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>
    </div>
  );
}
