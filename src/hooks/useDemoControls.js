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

  return { isDemo, scenario, scenarios: isDemo ? SCENARIOS : [], setScenario };
}
