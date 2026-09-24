import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bug, 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  Activity, 
  Zap, 
  Search, 
  Minimize2, 
  Maximize2,
  Terminal,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { syncService } from '../services/syncService';
import { GameState, LatencyHistoryPoint, LatencyStats } from '../types';

interface FloatingDebugPanelProps {
  gameState?: GameState;
}

export const FloatingDebugPanel: React.FC<FloatingDebugPanelProps> = ({ gameState: propGameState }) => {
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'JSON' | 'LATENCY'>('JSON');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMeasuringPing, setIsMeasuringPing] = useState<boolean>(false);
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Internal state if prop is not supplied
  const [internalState, setInternalState] = useState<GameState>(() => syncService.getGameState());
  const [latencyHistory, setLatencyHistory] = useState<LatencyHistoryPoint[]>([]);
  const [latencyStats, setLatencyStats] = useState<LatencyStats>(() => syncService.getLatencyStats());

  const currentGameState = propGameState || internalState;

  // 1. Check URL query param ?splitDebug=1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkQuery = () => {
      const params = new URLSearchParams(window.location.search);
      const isParamActive = params.get('splitDebug') === '1';
      setIsDebugMode(isParamActive);
    };
    checkQuery();
    window.addEventListener('popstate', checkQuery);
    return () => window.removeEventListener('popstate', checkQuery);
  }, []);

  // 2. Keyboard shortcut toggle (Ctrl+Shift+D or Alt+Shift+D or ~)
  useEffect(() => {
    if (!isDebugMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + D or Alt + Shift + D or Backtick (`)
      if (
        ((e.ctrlKey || e.altKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) ||
        (e.key === '`' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebugMode]);

  // 3. Subscribe to syncService state if prop not updating
  useEffect(() => {
    if (!isDebugMode) return;

    const unsubscribeState = syncService.subscribeToState((state) => {
      setInternalState(state);
      setUpdateCount(prev => prev + 1);
      setLastUpdated(new Date().toLocaleTimeString());
    });

    const unsubscribeLatency = syncService.subscribeToLatencyHistory((history, stats) => {
      setLatencyHistory(history);
      setLatencyStats(stats);
    });

    return () => {
      unsubscribeState();
      unsubscribeLatency();
    };
  }, [isDebugMode]);

  // Handle Copy JSON
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(currentGameState, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy raw JSON:', err);
    }
  };

  // Measure Ping Trigger
  const handleMeasurePing = async () => {
    setIsMeasuringPing(true);
    try {
      await syncService.measurePing();
    } catch (e) {
      console.warn('Ping measure error:', e);
    } finally {
      setTimeout(() => setIsMeasuringPing(false), 400);
    }
  };

  // Filtered JSON View
  const jsonDisplay = useMemo(() => {
    if (!searchQuery.trim()) {
      return JSON.stringify(currentGameState, null, 2);
    }
    const query = searchQuery.trim().toLowerCase();
    const filteredObj: Record<string, any> = {};
    
    Object.entries(currentGameState).forEach(([key, val]) => {
      if (
        key.toLowerCase().includes(query) ||
        JSON.stringify(val).toLowerCase().includes(query)
      ) {
        filteredObj[key] = val;
      }
    });

    return JSON.stringify(filteredObj, null, 2);
  }, [currentGameState, searchQuery]);

  if (!isDebugMode) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger Pill Button (Bottom-Left) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-3 left-3 z-[9990] bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Open syncService Debug Panel (Ctrl+Shift+D)"
        >
          <Bug className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>DEBUG</span>
          <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200">
            {latencyStats.currentMs !== null ? `${latencyStats.currentMs}ms` : 'Sync'}
          </span>
        </button>
      )}

      {/* Main Floating Debug Panel Window */}
      {isOpen && (
        <div 
          className={`fixed z-[9999] transition-all duration-200 font-mono shadow-2xl bg-slate-950/95 border border-emerald-500/40 text-emerald-100 backdrop-blur-xl rounded-lg overflow-hidden flex flex-col ${
            isMinimized 
              ? 'bottom-3 right-3 w-80 h-12' 
              : 'bottom-3 right-3 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[580px] h-[520px] max-h-[85vh]'
          }`}
        >
          {/* Panel Header Bar */}
          <div className="bg-slate-900/90 border-b border-emerald-500/30 px-3 py-2 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              <span className="font-bold text-xs text-emerald-300 tracking-wider uppercase">
                syncService Debug
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono">
                ?splitDebug=1
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded hover:bg-white/10 text-emerald-400 transition"
                title={isMinimized ? 'Expand Panel' : 'Minimize Panel'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition"
                title="Close Debug Panel (Ctrl+Shift+D)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Minimized Bar Content */}
          {isMinimized ? (
            <div className="px-3 py-1.5 flex items-center justify-between text-xs text-emerald-300">
              <span className="truncate">RTT: {latencyStats.currentMs ?? '--'}ms | Updates: {updateCount}</span>
              <span className="text-[10px] text-emerald-400/70">{lastUpdated || 'Live'}</span>
            </div>
          ) : (
            <>
              {/* Top Control Bar & Tabs */}
              <div className="p-2 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('JSON')}
                    className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                      activeTab === 'JSON' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400/70 hover:text-emerald-200'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Raw JSON State</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('LATENCY')}
                    className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                      activeTab === 'LATENCY' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400/70 hover:text-emerald-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Latencies ({latencyStats.currentMs ?? 0}ms)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMeasurePing}
                    disabled={isMeasuringPing}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs flex items-center gap-1 transition disabled:opacity-50"
                    title="Force measure network ping latency"
                  >
                    <Zap className={`w-3 h-3 ${isMeasuringPing ? 'animate-bounce text-amber-400' : 'text-emerald-400'}`} />
                    <span>{isMeasuringPing ? 'Pinging...' : 'Ping Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-1 transition"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-emerald-400" />}
                    <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col p-2 min-h-0 bg-slate-950">
                {activeTab === 'JSON' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Search & Meta Bar */}
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Filter state keys or values..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-xs text-emerald-200 pl-7 pr-2 py-1 rounded outline-none focus:border-emerald-500 transition"
                        />
                        <Search className="w-3.5 h-3.5 text-emerald-500/60 absolute left-2 top-1/2 -translate-y-1/2" />
                      </div>

                      <div className="text-[10px] text-emerald-400/80 bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>Rev: #{updateCount}</span>
                        {lastUpdated && <span className="opacity-60">({lastUpdated})</span>}
                      </div>
                    </div>

                    {/* Formatted JSON Code Container */}
                    <div className="flex-1 overflow-auto bg-slate-900/90 border border-slate-800 rounded p-3 text-xs leading-relaxed custom-scrollbar font-mono">
                      <pre className="text-emerald-300 whitespace-pre-wrap break-all select-all">
                        {jsonDisplay}
                      </pre>
                    </div>
                  </div>
                )}

                {activeTab === 'LATENCY' && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 p-1">
                    {/* Latency Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Current RTT</span>
                        <span className={`text-base font-bold ${
                          (latencyStats.currentMs ?? 0) < 100 ? 'text-emerald-400' :
                          (latencyStats.currentMs ?? 0) < 300 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {latencyStats.currentMs !== null ? `${latencyStats.currentMs} ms` : 'Offline'}
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Avg Latency</span>
                        <span className="text-base font-bold text-sky-400">
                          {latencyStats.avgMs} ms
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Jitter</span>
                        <span className="text-base font-bold text-purple-400">
                          {latencyStats.jitterMs} ms
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Stability</span>
                        <span className="text-base font-bold text-emerald-400">
                          {latencyStats.stabilityScore}%
                        </span>
                      </div>
                    </div>

                    {/* Extended Stats Grid */}
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800 text-xs grid grid-cols-3 gap-2 text-center text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Min Latency</span>
                        <span className="font-bold text-emerald-300">{latencyStats.minMs} ms</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Max Latency</span>
                        <span className="font-bold text-rose-300">{latencyStats.maxMs} ms</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Samples Tracked</span>
                        <span className="font-bold text-amber-300">{latencyStats.samplesCount}</span>
                      </div>
                    </div>

                    {/* Recent Latency Log */}
                    <div>
                      <h5 className="text-xs font-bold text-emerald-400 mb-1.5 flex items-center justify-between">
                        <span>Recent Latency History</span>
                        <span className="text-[10px] font-normal text-slate-400">Last 10 Measurements</span>
                      </h5>

                      <div className="bg-slate-900 border border-slate-800 rounded divide-y divide-slate-800 text-[11px]">
                        {latencyHistory.slice(-10).reverse().map((pt, idx) => (
                          <div key={pt.timestamp || idx} className="p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {pt.status === 'ONLINE' ? (
                                <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span className="text-slate-300 font-mono">
                                {new Date(pt.timestamp).toLocaleTimeString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`font-mono font-bold ${
                                pt.status === 'OFFLINE' ? 'text-rose-400' :
                                pt.displayLatency < 100 ? 'text-emerald-400' :
                                pt.displayLatency < 300 ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {pt.status === 'OFFLINE' ? 'OFFLINE' : `${pt.displayLatency} ms`}
                              </span>
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase">
                                {pt.quality}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer Status Bar */}
              <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 text-[10px] text-emerald-400/70 flex items-center justify-between shrink-0">
                <span>Shortcut: <kbd className="bg-slate-800 text-emerald-300 px-1 rounded border border-slate-700">Ctrl+Shift+D</kbd> or <kbd className="bg-slate-800 text-emerald-300 px-1 rounded border border-slate-700">~</kbd></span>
                <span>BTI 2026 Engine</span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
