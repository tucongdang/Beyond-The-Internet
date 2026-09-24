import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBatterySaverMode, setBatterySaverMode, getAutoBatterySaverEnabled, applyBatterySaverClasses } from '../utils/batterySaverUtils';

interface AnimationControlContextType {
  isBatterySaver: boolean;
  isAnimationsPaused: boolean;
  isThrottled: boolean;
  batteryLevel: number | null;
  toggleBatterySaver: () => void;
  setBatterySaver: (enabled: boolean) => void;
  setAnimationsPaused: (paused: boolean) => void;
}

const AnimationControlContext = createContext<AnimationControlContextType | undefined>(undefined);

const EVENT_NAME = 'bti_battery_saver_changed';

export const AnimationControlProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBatterySaver, setIsBatterySaverState] = useState<boolean>(getBatterySaverMode());
  const [manualAnimationsPaused, setManualAnimationsPaused] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  // Automatically pause/throttle non-critical animations when battery saver is active
  const isAnimationsPaused = isBatterySaver || manualAnimationsPaused;
  const isThrottled = isBatterySaver;

  useEffect(() => {
    let batteryManager: any = null;

    const handleBatteryChange = () => {
      if (!batteryManager) return;
      const level = batteryManager.level;
      const charging = batteryManager.charging;
      setBatteryLevel(level);

      // Auto trigger battery saver if battery level <= 20% and not charging
      if (getAutoBatterySaverEnabled() && level <= 0.20 && !charging) {
        if (!getBatterySaverMode()) {
          setBatterySaverMode(true);
          window.dispatchEvent(new CustomEvent('bti_battery_saver_auto_triggered', { detail: { level } }));
        }
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryManager = battery;
        handleBatteryChange();

        batteryManager.addEventListener('levelchange', handleBatteryChange);
        batteryManager.addEventListener('chargingchange', handleBatteryChange);
      });
    }

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setIsBatterySaverState(customEvent.detail.enabled);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bti_battery_saver_mode') {
        setIsBatterySaverState(e.newValue === 'true');
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageChange);
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', handleBatteryChange);
        batteryManager.removeEventListener('chargingchange', handleBatteryChange);
      }
    };
  }, []);

  // Synchronize CSS class hooks on documentElement for CSS animation pausing/throttling
  useEffect(() => {
    applyBatterySaverClasses(isBatterySaver);

    if (isAnimationsPaused) {
      document.documentElement.classList.add('animations-paused');
    } else {
      document.documentElement.classList.remove('animations-paused');
    }

    if (isThrottled) {
      document.documentElement.classList.add('animations-throttled');
    } else {
      document.documentElement.classList.remove('animations-throttled');
    }
  }, [isBatterySaver, isAnimationsPaused, isThrottled]);

  const toggleBatterySaver = () => {
    const nextVal = !isBatterySaver;
    setBatterySaverMode(nextVal);
  };

  const handleSetBatterySaver = (enabled: boolean) => {
    setBatterySaverMode(enabled);
  };

  return (
    <AnimationControlContext.Provider
      value={{
        isBatterySaver,
        isAnimationsPaused,
        isThrottled,
        batteryLevel,
        toggleBatterySaver,
        setBatterySaver: handleSetBatterySaver,
        setAnimationsPaused: setManualAnimationsPaused,
      }}
    >
      {children}
    </AnimationControlContext.Provider>
  );
};

export function useAnimationControl(): AnimationControlContextType {
  const context = useContext(AnimationControlContext);
  if (!context) {
    // Fallback if rendered outside provider
    const isBS = getBatterySaverMode();
    return {
      isBatterySaver: isBS,
      isAnimationsPaused: isBS,
      isThrottled: isBS,
      batteryLevel: null,
      toggleBatterySaver: () => setBatterySaverMode(!isBS),
      setBatterySaver: setBatterySaverMode,
      setAnimationsPaused: () => {},
    };
  }
  return context;
}
