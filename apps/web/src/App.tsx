import { MapContainer } from './components/Map/MapContainer';
import { TopBar } from './components/UI/TopBar';
import { LayerPanel } from './components/UI/LayerPanel';
import { AircraftPanel } from './components/UI/AircraftPanel';
import { DetectionPanel } from './components/UI/DetectionPanel';
import { AlertsPanel } from './components/UI/AlertsPanel';
import { StatusBar } from './components/UI/StatusBar';
import { MiniRadar } from './components/UI/MiniRadar';
import { CompassRose } from './components/UI/CompassRose';
import { BasemapSelector } from './components/UI/BasemapSelector';
import { MeasureTool } from './components/UI/MeasureTool';
import { WindIndicator } from './components/UI/WindIndicator';
import { AircraftDrawer } from './components/UI/AircraftDrawer';
import { AlertTicker } from './components/UI/AlertTicker';
import { ScreenCapture } from './components/UI/ScreenCapture';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEffect, useReducer } from 'react';
import './App.css';

function App() {
  useWebSocket();
  useKeyboardShortcuts();
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Force clock updates every second
  useEffect(() => {
    const iv = setInterval(forceUpdate, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="app-root">
      <MapContainer />
      <div className="ui-overlay">
        <TopBar />
        <AlertTicker />
        <div className="side-panels">
          <div className="left-panels">
            <LayerPanel />
            <div className="widgets-row">
              <MiniRadar />
              <CompassRose />
              <WindIndicator />
            </div>
            <div className="tools-row">
              <BasemapSelector />
              <MeasureTool />
              <ScreenCapture />
            </div>
            <AlertsPanel />
          </div>
          <div className="right-panels">
            <AircraftPanel />
            <DetectionPanel />
          </div>
        </div>
        <AircraftDrawer />
        <StatusBar />
      </div>
    </div>
  );
}

export default App;
