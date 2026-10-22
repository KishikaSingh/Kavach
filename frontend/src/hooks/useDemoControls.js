import { useCallback, useState } from 'react';
import { DATA_SOURCE } from '../config.js';
import { SCENARIOS } from '../data/mockData.js';
import { demoStore } from '../services/demoStore.js';

// Demo-only helper so the team (and the demo audience) can flip the pretend helmet
// between situations: offline, GPS lost, new accident alert, and so on.
// useDemoControls() -> { isDemo, scenario, scenarios, setScenario(name) }
// In live mode isDemo is false and setScenario does nothing: render no controls then.
export function useDemoControls() {
  const isDemo = DATA_SOURCE === 'demo';
  const [scenario, setScenarioState] = useState(isDemo ? demoStore.getScenario() : null);

  const setScenario = useCallback(
    (name) => {
      if (!isDemo || !SCENARIOS.includes(name)) return;
      demoStore.setScenario(name);
      setScenarioState(name);
    },
    [isDemo]
  );

  const setBattery = useCallback((level) => {
    if (!isDemo) return;
    demoStore.setBatteryLevel(level);
  }, [isDemo]);

  const setConnectivity = useCallback((connected) => {
    if (!isDemo) return;
    demoStore.setConnectivity(connected);
  }, [isDemo]);

  const setGps = useCallback((status) => {
    if (!isDemo) return;
    demoStore.setGpsStatus(status);
  }, [isDemo]);

  const setSensors = useCallback((status) => {
    if (!isDemo) return;
    demoStore.setSensorStatus(status);
  }, [isDemo]);

  const triggerAccident = useCallback((options) => {
    if (!isDemo) return null;
    return demoStore.triggerSimulatedAccident(options);
  }, [isDemo]);

  const resetDemo = useCallback(() => {
    if (!isDemo) return;
    demoStore.reset();
    setScenarioState('normal');
  }, [isDemo]);

  return {
    isDemo,
    scenario,
    scenarios: isDemo ? SCENARIOS : [],
    setScenario,
    setBattery,
    setConnectivity,
    setGps,
    setSensors,
    triggerAccident,
    resetDemo,
  };
}
export default useDemoControls;
