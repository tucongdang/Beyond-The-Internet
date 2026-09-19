const fs = require('fs');

let code = fs.readFileSync('src/utils/batterySaverUtils.ts', 'utf8');

const hookAddition = `
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
`;

code = code.replace(/export function useBatterySaver\(\) \{[\s\S]*\}?/, hookAddition);

fs.writeFileSync('src/utils/batterySaverUtils.ts', code);
