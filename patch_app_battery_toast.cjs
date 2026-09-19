const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add batteryToast state
if (!code.includes('const [batteryToast, setBatteryToast]')) {
  code = code.replace(/const \[isCopiedQrUrl, setIsCopiedQrUrl\] = useState\(false\);/, "const [isCopiedQrUrl, setIsCopiedQrUrl] = useState(false);\n  const [batteryToast, setBatteryToast] = useState<{message: string, show: boolean}>({ message: '', show: false });");
}

// 2. Add useEffect for battery auto trigger
if (!code.includes('bti_battery_saver_auto_triggered')) {
  const useEffectBlock = `
  useEffect(() => {
    const handleBatteryTrigger = (e: any) => {
      setBatteryToast({ message: \`Đã tự động bật chế độ siêu tiết kiệm pin (Pin: \${Math.round(e.detail.level * 100)}%)\`, show: true });
      setTimeout(() => setBatteryToast({ message: '', show: false }), 5000);
    };
    window.addEventListener('bti_battery_saver_auto_triggered', handleBatteryTrigger);
    return () => window.removeEventListener('bti_battery_saver_auto_triggered', handleBatteryTrigger);
  }, []);
`;
  code = code.replace(/useEffect\(\(\) => \{\n\s*const validateAuth = async \(\)/, useEffectBlock + "\n  useEffect(() => {\n    const validateAuth = async ()");
}

// 3. Add UI for the toast
if (!code.includes('batteryToast.show')) {
  const toastUI = `
      {batteryToast.show && (
        <div className="fixed top-20 right-4 z-[9999] bg-green-900/90 text-green-100 px-4 py-3 rounded shadow-lg border border-green-500/50 flex items-center gap-2 animate-fadeIn">
          <Zap className="w-5 h-5 text-green-400 animate-pulse" />
          <span className="text-sm font-medium">{batteryToast.message}</span>
        </div>
      )}
`;
  code = code.replace(/\{currentView === 'landing' && \(/, toastUI + "\n      {currentView === 'landing' && (");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with Battery Toast.");
