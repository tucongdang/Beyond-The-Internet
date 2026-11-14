import React, { useState } from 'react';
import {
  WifiOff,
  Cloud,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpCircle,
  Database,
} from 'lucide-react';
import { useOfflineSyncState } from '../utils/offlineModeUtils';
import {
  useServiceWorkerStatus,
  refreshOfflineAssetCache,
  triggerBackgroundResponseSync,
} from '../services/serviceWorkerManager';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';
import { UserInfo } from '../types';

interface OfflineModePanelProps {
  user?: UserInfo | null;
  forceLanguage?: 'vi' | 'en';
  isFirebaseConnected?: boolean;
  compact?: boolean;
}

export const OfflineModePanel: React.FC<OfflineModePanelProps> = ({
  user,
  forceLanguage,
  isFirebaseConnected: externalConnected,
  compact = false,
}) => {
  const { localLanguage } = useLanguage();
  const effectiveLanguage = forceLanguage || localLanguage;
  const isEn = effectiveLanguage !== 'vi';

  const syncState = useOfflineSyncState();
  const swStatus = useServiceWorkerStatus();
  const [isToggling, setIsToggling] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  const isConnected =
    typeof externalConnected === 'boolean'
      ? externalConnected
      : syncService.getIsFirebaseConnected();

  const userProgress = user?.uid
    ? syncState.progressByUid[user.uid]
    : Object.values(syncState.progressByUid)[0];

  const totalSavedAnswers = userProgress?.totalSavedAnswers || 0;
  const pendingItems = user?.uid
    ? syncState.pendingItems.filter((item) => item.uid === user.uid)
    : syncState.pendingItems;
  const pendingCount = syncState.pendingCount;

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return isEn ? 'Not yet' : 'Chưa có';
    return new Date(ts).toLocaleTimeString(isEn ? 'en-US' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleToggleOfflineMode = async () => {
    if (isToggling) return;
    const nextEnabled = !syncState.isOfflineMode;
    setIsToggling(true);
    setStatusNotice(null);
    soundFx.playClick();
    vibrateTap();

    try {
      const result = await syncService.setOfflineMode(nextEnabled);
      if (nextEnabled) {
        if (result.syncedCount > 0) {
          vibrateSuccess();
          setStatusNotice({
            type: 'success',
            text: isEn
              ? `Offline Backup enabled (and synced ${result.syncedCount} queued item(s)). You stay online now, and progress will keep saving locally if WiFi/4G drops.`
              : `Đã bật Chế Độ Ngoại Tuyến (và đồng bộ ${result.syncedCount} mục chờ). Hệ thống vẫn kết nối bình thường khi có mạng và sẽ tự lưu cục bộ nếu sập WiFi/4G.`,
          });
        } else {
          vibrateSuccess();
          setStatusNotice({
            type: 'info',
            text: isEn
              ? 'Offline Mode enabled. Live sync stays active while online, and your quiz progress will keep saving locally if WiFi/4G drops.'
              : 'Đã bật Chế Độ Ngoại Tuyến. Bạn vẫn đồng bộ trực tuyến bình thường khi có mạng, và mọi tiến trình thi vẫn được lưu cục bộ nếu sập WiFi hoặc hết 4G.',
          });
        }
      } else if (result.syncedCount > 0) {
        vibrateSuccess();
        setStatusNotice({
          type: 'success',
          text: isEn
            ? `Offline Mode disabled. Synced ${result.syncedCount} remaining item(s) to Firebase.`
            : `Đã tắt Chế Độ Ngoại Tuyến và đồng bộ ${result.syncedCount} mục còn lại lên Firebase.`,
        });
      } else {
        setStatusNotice({
          type: 'info',
          text: isEn
            ? 'Offline Mode disabled. Quiz answers now require an active network connection to save.'
            : 'Đã tắt Chế Độ Ngoại Tuyến. Từ giờ câu trả lời cần có kết nối mạng trực tiếp để gửi lên Firebase.',
        });
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleSyncNow = async () => {
    if (syncState.isSyncing || isToggling) return;
    soundFx.playClick();
    vibrateTap();
    setStatusNotice(null);
    setIsToggling(true);
    try {
      const [result, swSyncResult] = await Promise.all([
        syncService.syncPendingOfflineProgress(true),
        triggerBackgroundResponseSync(),
      ]);
      const totalSynced = result.syncedCount + (swSyncResult.replayedCount || 0);

      if (totalSynced > 0) {
        vibrateSuccess();
        setStatusNotice({
          type: 'success',
          text: isEn
            ? `Synced ${totalSynced} saved item(s) to the server & Firebase.`
            : `Đã đồng bộ thành công ${totalSynced} mục chờ lên máy chủ & Firebase!`,
        });
      } else if (result.pendingCount === 0 && swSyncResult.pendingCount === 0) {
        setStatusNotice({
          type: 'info',
          text: isEn
            ? 'All local quiz progress is already synced with Firebase.'
            : 'Toàn bộ tiến trình cục bộ đã được đồng bộ đầy đủ với Firebase.',
        });
      } else {
        setStatusNotice({
          type: 'warning',
          text: isEn
            ? 'Still no WiFi/4G or Firebase unreachable. Your progress remains safely stored locally and will auto-sync once reconnected.'
            : 'Chưa có kết nối WiFi/4G hoặc máy chủ Firebase chưa phản hồi. Tiến trình vẫn được lưu an toàn trên máy và sẽ tự đồng bộ khi có mạng.',
        });
      }
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-3.5 text-left">
      {/* Master Offline Mode Toggle Card */}
      <div
        className={`p-3.5 sm:p-4 rounded-[2px] border transition-colors ${
          syncState.isOfflineMode && !isConnected
            ? 'bg-amber-950/35 border-amber-400/50'
            : syncState.isOfflineMode
            ? 'bg-sky-950/30 border-sky-400/45'
            : 'fluent-box-nested border-white/10'
        }`}
      >
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-[2px] border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                syncState.isOfflineMode && !isConnected
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                  : syncState.isOfflineMode
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                  : 'bg-sky-500/15 text-sky-300 border-sky-400/35'
              }`}
            >
              {syncState.isOfflineMode && !isConnected ? (
                <WifiOff className="w-4 h-4" />
              ) : syncState.isOfflineMode ? (
                <HardDrive className="w-4 h-4" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold font-mono text-white">
                  {isEn ? 'Offline Mode (Network-Drop Backup)' : 'Chế Độ Ngoại Tuyến (Lưu Dự Phòng Khi Mất Mạng)'}
                </h4>
                <span
                  data-testid="offline-mode-status-badge"
                  className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold uppercase border ${
                    syncState.isOfflineMode && !isConnected
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                      : syncState.isOfflineMode && isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : !syncState.isOfflineMode && !isConnected
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                      : 'bg-white/10 text-white/75 border-white/20'
                  }`}
                >
                  {syncState.isOfflineMode
                    ? isConnected
                      ? isEn
                        ? 'ONLINE • BACKUP ON'
                        : 'TRỰC TUYẾN • DỰ PHÒNG BẬT'
                      : isEn
                      ? 'OFFLINE • SAVING LOCALLY'
                      : 'MẤT MẠNG • LƯU CỤC BỘ'
                    : isConnected
                    ? isEn
                      ? 'ONLINE ONLY'
                      : 'CHỈ TRỰC TUYẾN'
                    : isEn
                    ? 'DISCONNECTED'
                    : 'MẤT MẠNG'}
                </span>
              </div>
              <p className="text-[11px] text-[#B6A6D8] leading-relaxed mt-1">
                {isEn
                  ? 'Stay connected to Firebase while online, and keep saving quiz answers & progress locally whenever WiFi or 4G disconnects. Automatically syncs once reconnected.'
                  : 'Vẫn kết nối mạng bình thường khi có WiFi/4G, đồng thời tự động lưu cục bộ mọi đáp án và tiến trình thi nếu sập WiFi hoặc hết 4G. Hệ thống tự đồng bộ lên Firebase ngay khi có mạng lại.'}
              </p>
            </div>
          </div>

          <button
            id="switch-offline-mode"
            type="button"
            role="switch"
            aria-checked={syncState.isOfflineMode}
            aria-label={isEn ? 'Toggle Offline Mode' : 'Bật hoặc tắt Chế độ Ngoại tuyến'}
            disabled={isToggling}
            onClick={handleToggleOfflineMode}
            className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-200 cursor-pointer shrink-0 disabled:opacity-60 ${
              syncState.isOfflineMode
                ? 'bg-emerald-500 justify-end'
                : 'bg-gray-700 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
          </button>
        </div>
      </div>

      {/* Inline Feedback Notice */}
      {statusNotice && (
        <div
          role="status"
          className={`p-3 rounded-[2px] border text-xs font-mono flex items-start gap-2 ${
            statusNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : statusNotice.type === 'warning'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              : 'bg-amber-950/35 border-amber-400/40 text-amber-200'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : statusNotice.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <HardDrive className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          )}
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Local Progress & Firebase Sync Summary Card */}
      <div className="p-3.5 sm:p-4 rounded-[2px] fluent-box-nested border border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <HardDrive className="w-4 h-4 text-sky-300" />
            <span>
              {isEn
                ? 'Local Quiz Progress & Sync Queue'
                : 'Tiến Trình Lưu Cục Bộ & Hàng Đợi Đồng Bộ'}
            </span>
          </div>
          {syncState.isSyncing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-sky-500/20 border border-sky-400/40 text-sky-200 text-[10px] font-mono font-bold">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{isEn ? 'Syncing...' : 'Đang đồng bộ...'}</span>
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
          <div className="p-2.5 rounded-[2px] bg-black/30 border border-white/10">
            <div className="text-[10px] font-mono text-white/55 uppercase">
              {isEn ? 'Saved Answers' : 'Câu Đã Lưu'}
            </div>
            <div
              data-testid="offline-saved-answers-count"
              className="text-lg font-black font-mono text-white tabular-nums mt-0.5"
            >
              {totalSavedAnswers}
            </div>
          </div>

          <div className="p-2.5 rounded-[2px] bg-black/30 border border-white/10">
            <div className="text-[10px] font-mono text-white/55 uppercase">
              {isEn ? 'Pending Sync' : 'Chờ Đồng Bộ'}
            </div>
            <div
              data-testid="offline-pending-sync-count"
              className={`text-lg font-black font-mono tabular-nums mt-0.5 ${
                pendingCount > 0 ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {pendingCount}
            </div>
          </div>

          <div className="p-2.5 rounded-[2px] bg-black/30 border border-white/10">
            <div className="text-[10px] font-mono text-white/55 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-300" />
              <span>{isEn ? 'Last Saved' : 'Lưu Gần Nhất'}</span>
            </div>
            <div className="text-xs font-bold font-mono text-sky-200 mt-1">
              {formatTimestamp(syncState.lastSavedAt)}
            </div>
          </div>

          <div className="p-2.5 rounded-[2px] bg-black/30 border border-white/10">
            <div className="text-[10px] font-mono text-white/55 uppercase flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-300" />
              <span>{isEn ? 'Last Synced' : 'Đồng Bộ Cuối'}</span>
            </div>
            <div className="text-xs font-bold font-mono text-emerald-200 mt-1">
              {formatTimestamp(syncState.lastSyncedAt)}
            </div>
          </div>
        </div>

        {/* Queued Items Preview */}
        {pendingItems.length > 0 && (
          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 font-bold">
              {isEn
                ? `Queued local progress (${pendingItems.length})`
                : `Dữ liệu đang chờ đồng bộ (${pendingItems.length})`}
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar pr-1">
              {pendingItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="px-2.5 py-1.5 rounded-[2px] bg-black/35 border border-amber-500/20 flex items-center justify-between gap-2 text-[11px] font-mono"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-200 text-[9px] uppercase font-bold shrink-0">
                      {item.type}
                    </span>
                    <span className="text-white/85 truncate">
                      {item.questionId || item.uid}
                    </span>
                    {item.payload?.choice && (
                      <span className="text-sky-300 font-bold shrink-0">
                        • {item.payload.choice}
                      </span>
                    )}
                  </div>
                  <span className="text-white/45 text-[10px] shrink-0">
                    {formatTimestamp(item.savedAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last sync warning if any */}
        {syncState.lastSyncError && (
          <div className="p-2.5 rounded-[2px] bg-rose-950/35 border border-rose-500/35 text-[11px] text-rose-200 font-mono flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>{syncState.lastSyncError}</span>
          </div>
        )}

        {/* Sync Action Button */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-white/50">
            {syncState.isOfflineMode
              ? isEn
                ? 'Backup is active. Queued answers auto-sync as soon as WiFi/4G returns.'
                : 'Đang bật dự phòng. Đáp án lưu cục bộ sẽ tự đồng bộ ngay khi có WiFi/4G lại.'
              : isEn
              ? 'Enable Offline Mode to keep saving quiz progress during network drops.'
              : 'Bật Chế độ Ngoại tuyến để không mất tiến trình khi sập WiFi hoặc hết 4G.'}
          </span>

          <button
            id="btn-sync-offline-progress"
            type="button"
            disabled={syncState.isSyncing || isToggling}
            onClick={handleSyncNow}
            className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
              pendingCount > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-300/60'
                : 'bg-sky-600 hover:bg-sky-500 text-white border border-sky-400/50'
            }`}
          >
            {syncState.isSyncing || isToggling ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowUpCircle className="w-3.5 h-3.5" />
            )}
            <span>
              {isEn ? 'Sync Now' : 'Đồng Bộ Lên Firebase'}
            </span>
          </button>
        </div>
      </div>

      {/* Service Worker & Cache API Asset Status */}
      {swStatus.supported && (
        <div
          id="sw-cache-status-card"
          className="p-3 rounded-[2px] bg-black/30 border border-white/10 space-y-2"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    swStatus.active && swStatus.shellReady
                      ? 'bg-emerald-400'
                      : swStatus.registered
                      ? 'bg-sky-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-[11px] font-mono font-bold text-white">
                  {isEn
                    ? 'Service Worker • Cache & Background Sync'
                    : 'Service Worker • Bộ Nhớ Đệm & Đồng Bộ Nền'}
                </span>
              </div>
              <p className="text-[10px] font-mono text-white/60 mt-0.5">
                {swStatus.active && swStatus.shellReady
                  ? isEn
                    ? `Active • ${swStatus.cachedFonts} font(s) • ${swStatus.nonCriticalCached} SWR media/assets (${swStatus.totalCached} total cached)`
                    : `Đang hoạt động • ${swStatus.cachedFonts} font • ${swStatus.nonCriticalCached} tài nguyên SWR (${swStatus.totalCached} mục đã lưu)`
                  : swStatus.registered
                  ? isEn
                    ? 'Service Worker registered • Caching shell & fonts...'
                    : 'Đã đăng ký Service Worker • Đang lưu tài nguyên...'
                  : isEn
                  ? 'Initializing Cache API...'
                  : 'Đang khởi tạo bộ nhớ đệm Cache API...'}
              </p>
            </div>

            <button
              id="btn-refresh-sw-cache"
              type="button"
              disabled={swStatus.isRefreshing}
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                void refreshOfflineAssetCache();
              }}
              className="px-2.5 py-1 rounded-[2px] bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] font-mono font-bold text-white/90 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${swStatus.isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isEn ? 'Refresh Cache' : 'Làm Mới Cache'}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono">
            <span className="text-white/60">
              {isEn ? 'SW Background Sync Queue:' : 'Hàng đợi Background Sync:'}{' '}
              <strong
                data-testid="sw-bgsync-pending-count"
                className={swStatus.bgSyncPendingCount > 0 ? 'text-amber-300' : 'text-emerald-300'}
              >
                {swStatus.bgSyncPendingCount}
              </strong>
              {swStatus.lastBgSyncAt ? (
                <span className="text-white/40 ml-2">
                  • {isEn ? 'Last:' : 'Gần nhất:'} {formatTimestamp(swStatus.lastBgSyncAt)}
                </span>
              ) : null}
            </span>
            {swStatus.bgSyncPendingCount > 0 && (
              <button
                id="btn-flush-sw-bgsync"
                type="button"
                disabled={swStatus.isBgSyncing}
                onClick={() => {
                  soundFx.playClick();
                  vibrateTap();
                  void triggerBackgroundResponseSync();
                }}
                className="px-2 py-0.5 rounded-[2px] bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold cursor-pointer disabled:opacity-50"
              >
                {swStatus.isBgSyncing
                  ? isEn
                    ? 'Replaying...'
                    : 'Đang phát lại...'
                  : isEn
                  ? 'Flush SW Queue'
                  : 'Xử Lý Hàng Đợi'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
