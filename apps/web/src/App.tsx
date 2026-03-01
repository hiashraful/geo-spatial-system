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
import { AltitudeChart } from './components/UI/AltitudeChart';
import { ThreatLevel } from './components/UI/ThreatLevel';
import { TrafficSparklines } from './components/UI/TrafficSparklines';
import { SignalIndicator } from './components/UI/SignalIndicator';
import { ShortcutsModal } from './components/UI/ShortcutsModal';
import { SearchDialog } from './components/UI/SearchDialog';
import { DataExport } from './components/UI/DataExport';
import { Timeline } from './components/UI/Timeline';
import { ViewModeSelector } from './components/UI/ViewModeSelector';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMapStore } from './store/useMapStore';
import { useEffect, useReducer } from 'react';
import './App.css';

function App() {
  useWebSocket();
  useKeyboardShortcuts();
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const viewMode = useMapStore((s) => s.viewMode);

  // Force clock updates every second
  useEffect(() => {
    const iv = setInterval(forceUpdate, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className={`app-root ${viewMode !== 'normal' ? `viewmode-${viewMode}` : ''}`}>
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
            <div className="intel-row">
              <ThreatLevel />
              <AltitudeChart />
            </div>
            <TrafficSparklines />
            <div className="tools-row">
              <BasemapSelector />
              <ViewModeSelector />
              <MeasureTool />
              <ScreenCapture />
              <DataExport />
            </div>
            <AlertsPanel />
          </div>
          <div className="right-panels">
            <AircraftPanel />
            <DetectionPanel />
          </div>
        </div>
        <AircraftDrawer />
        <Timeline />
        <StatusBar />
      </div>
      <ShortcutsModal />
      <SearchDialog />
    </div>
  );
}

export default App;
