import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { useMapStore } from '../store/useMapStore';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playAlertTone() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Two-tone alert: short high beep followed by lower beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(660, now + 0.15);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.06, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.35);
  } catch {
    // Audio not available
  }
}

export function useAlertNotification() {
  const geofenceAlerts = useTelemetryStore((s) => s.geofenceAlerts);
  const alertsMuted = useMapStore((s) => s.alertsMuted);
  const prevCount = useRef(0);

  useEffect(() => {
    if (geofenceAlerts.length > prevCount.current && prevCount.current > 0) {
      // New alert arrived (skip initial load)
      if (!alertsMuted) {
        playAlertTone();
      }

      // Dispatch flash event for visual feedback
      window.dispatchEvent(new CustomEvent('geofence-alert-flash'));
    }
    prevCount.current = geofenceAlerts.length;
  }, [geofenceAlerts, alertsMuted]);
}
