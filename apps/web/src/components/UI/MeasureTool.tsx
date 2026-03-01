import { useMapStore } from '../../store/useMapStore';

export function MeasureTool() {
  const activeTool = useMapStore((s) => s.activeTool);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const measurePoints = useMapStore((s) => s.measurePoints);
  const clearMeasurePoints = useMapStore((s) => s.clearMeasurePoints);

  const isActive = activeTool === 'measure';

  const toggleMeasure = () => {
    if (isActive) {
      setActiveTool('none');
      clearMeasurePoints();
    } else {
      setActiveTool('measure');
    }
  };

  // Calculate distance if we have 2 points
  let distanceText = '';
  if (measurePoints.length === 2) {
    const [p1, p2] = measurePoints;
    const dist = haversineDistance(p1.lngLat[1], p1.lngLat[0], p2.lngLat[1], p2.lngLat[0]);

    if (dist < 1) {
      distanceText = `${(dist * 1000).toFixed(0)} m`;
    } else if (dist < 100) {
      distanceText = `${dist.toFixed(2)} km / ${(dist * 0.539957).toFixed(2)} nm`;
    } else {
      distanceText = `${dist.toFixed(1)} km / ${(dist * 0.539957).toFixed(1)} nm`;
    }
  }

  return (
    <div className="measure-tool">
      <button
        className={`measure-btn ${isActive ? 'active' : ''}`}
        onClick={toggleMeasure}
        title="Measure distance (M)"
      >
        RULER
      </button>
      {isActive && (
        <div className="measure-info">
          {measurePoints.length === 0 && <span className="measure-hint">CLICK START POINT</span>}
          {measurePoints.length === 1 && <span className="measure-hint">CLICK END POINT</span>}
          {distanceText && <span className="measure-distance">{distanceText}</span>}
          {measurePoints.length > 0 && (
            <button className="measure-clear" onClick={clearMeasurePoints}>
              CLR
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Haversine formula - returns distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
