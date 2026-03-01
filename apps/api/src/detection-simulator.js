/**
 * AI Detection Simulator
 * Simulates object detection results from traffic cameras.
 * In production, this would be replaced by the Python AI microservice.
 */

const DETECTION_CLASSES = [
  { name: 'vehicle', weight: 40 },
  { name: 'person', weight: 25 },
  { name: 'truck', weight: 15 },
  { name: 'bus', weight: 8 },
  { name: 'bicycle', weight: 5 },
  { name: 'motorcycle', weight: 4 },
  { name: 'emergency_vehicle', weight: 2 },
  { name: 'suspicious_package', weight: 1 },
];

const TOTAL_WEIGHT = DETECTION_CLASSES.reduce((sum, c) => sum + c.weight, 0);

function pickClass() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const cls of DETECTION_CLASSES) {
    r -= cls.weight;
    if (r <= 0) return cls.name;
  }
  return 'vehicle';
}

export class DetectionSimulator {
  constructor() {
    this.cameras = [];
    this.running = false;
    this.intervalId = null;
    this.listeners = [];
  }

  setCameras(cameras) {
    this.cameras = cameras;
  }

  getCameraCount() {
    return this.cameras.length;
  }

  onDetection(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  start() {
    if (this.running) return;
    this.running = true;

    // Generate detections every 3 seconds
    this.intervalId = setInterval(() => this._generateDetections(), 3000);
    console.log('[Detection] Simulator started');
  }

  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  _generateDetections() {
    if (this.cameras.length === 0) return;

    const detections = [];

    for (const camera of this.cameras) {
      // Each camera detects 0-8 objects per frame
      const count = Math.floor(Math.random() * 9);

      for (let i = 0; i < count; i++) {
        const className = pickClass();
        const confidence = 0.5 + Math.random() * 0.49;

        // Offset detection position slightly from camera
        const offsetLat = (Math.random() - 0.5) * 0.002;
        const offsetLon = (Math.random() - 0.5) * 0.002;

        detections.push({
          id: `det-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          sourceType: 'traffic_camera',
          sourceId: camera.camera_id,
          sourceName: camera.name,
          className,
          confidence: Math.round(confidence * 100) / 100,
          latitude: camera.latitude + offsetLat,
          longitude: camera.longitude + offsetLon,
          bbox: {
            x: Math.random() * 800,
            y: Math.random() * 600,
            width: 30 + Math.random() * 200,
            height: 30 + Math.random() * 200,
          },
          timestamp: Date.now(),
        });
      }
    }

    // Aggregate counts per camera
    const cameraCounts = {};
    for (const det of detections) {
      if (!cameraCounts[det.sourceId]) {
        cameraCounts[det.sourceId] = {};
      }
      cameraCounts[det.sourceId][det.className] = (cameraCounts[det.sourceId][det.className] || 0) + 1;
    }

    const payload = {
      detections: detections.filter(d => d.confidence > 0.6), // Only high-confidence
      summary: cameraCounts,
      timestamp: Date.now(),
      frameCount: this.cameras.length,
    };

    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('[Detection] Listener error:', err.message);
      }
    }
  }
}
