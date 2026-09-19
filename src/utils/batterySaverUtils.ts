import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bti_battery_saver_mode';
const AUTO_THRESHOLD_KEY = 'bti_battery_saver_auto_threshold';
const EVENT_NAME = 'bti_battery_saver_changed';

export function getBatterySaverMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setBatterySaverMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {}

  applyBatterySaverClasses(enabled);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled } }));
}

export function getAutoBatterySaverEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(AUTO_THRESHOLD_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setAutoBatterySaverEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTO_THRESHOLD_KEY, String(enabled));
  } catch {}
}

export function applyBatterySaverClasses(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  if (enabled) {
    document.documentElement.classList.add('battery-saver-active', 'audience-high-contrast');
    document.body.classList.add('battery-saver-active', 'audience-high-contrast');
  } else {
    document.documentElement.classList.remove('battery-saver-active');
    document.body.classList.remove('battery-saver-active');
    try {
      const isHighContrast = localStorage.getItem('bti_audience_high_contrast') === 'true';
      if (!isHighContrast) {
        document.documentElement.classList.remove('audience-high-contrast');
        document.body.classList.remove('audience-high-contrast');
      }
    } catch {}
  }
}


export function useBatterySaver() {
  const [isBatterySaver, setIsBatterySaver] = useState<boolean>(getBatterySaverMode());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    let batteryManager: any = null;

    const handleBatteryChange = () => {
      if (!batteryManager) return;
      const level = batteryManager.level;
      const charging = batteryManager.charging;
      setBatteryLevel(level);

      // Tự động phát hiện và kích hoạt chế độ siêu tiết kiệm pin nếu dưới 20% và không sạc
      if (getAutoBatterySaverEnabled()) {
        if (level <= 0.20 && !charging) {
          if (!getBatterySaverMode()) {
            setBatterySaverMode(true);
            // Có thể dispatch event thêm cho UI biết để hiển thị thông báo
            window.dispatchEvent(new CustomEvent('bti_battery_saver_auto_triggered', { detail: { level } }));
          }
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
      setIsBatterySaver(customEvent.detail.enabled);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setIsBatterySaver(e.newValue === 'true');
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

  const toggleBatterySaver = () => {
    const nextVal = !isBatterySaver;
    setBatterySaverMode(nextVal);
  };

  return { isBatterySaver, batteryLevel, toggleBatterySaver, setBatterySaver: setBatterySaverMode };
}
