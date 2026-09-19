import React, { useState } from 'react';
import { FirebaseConfig } from '../types';
import { syncService } from '../services/syncService';
import { Database, CheckCircle2, AlertTriangle, ExternalLink, X, Save, RefreshCw } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateSubmit, vibrateSuccess, vibrateError, vibrateTap } from '../utils/hapticUtils';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
  isConnected
}) => {
  const existingConfig = syncService.getFirebaseConfig();
  const [databaseURL, setDatabaseURL] = useState(existingConfig?.databaseURL || '');
  const [apiKey, setApiKey] = useState(existingConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(existingConfig?.projectId || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!databaseURL.trim()) {
      vibrateError();
      setStatusMsg({ type: 'error', text: 'Vui lòng nhập Firebase Database URL (https://...firebaseio.com)' });
      return;
    }

    soundFx.playClick();
    vibrateSubmit();
    const config: FirebaseConfig = {
      databaseURL: databaseURL.trim(),
      apiKey: apiKey.trim() || undefined,
      projectId: projectId.trim() || undefined
    };

    const success = syncService.initializeFirebase(config);
    if (success) {
      vibrateSuccess();
      setStatusMsg({ type: 'success', text: 'Đã kết nối thành công tới Firebase Realtime Database!' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      vibrateError();
      setStatusMsg({ type: 'error', text: 'Không thể kết nối. Vui lòng kiểm tra lại URL định dạng Firebase RTDB.' });
    }
  };

  const handleDisconnect = () => {
    soundFx.playClick();
    vibrateTap();
    syncService.disconnectFirebase();
    setDatabaseURL('');
    setApiKey('');
    setProjectId('');
    setStatusMsg({ type: 'success', text: 'Đã ngắt kết nối Firebase. Đang dùng chế độ Đồng bộ Realtime Cục bộ / Đa tab.' });
  };

  return (
    <div
      id="firebase-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0420]/80 backdrop-blur-sm animate-fadeIn"
    >
      <div
        id="firebase-modal-card"
        className="w-full max-w-lg fluent-box rounded-[2px] shadow-2xl p-6 text-[#F5EFF9] relative overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[2px] fluent-box-nested text-[#F7CAC9] flex items-center justify-center border border-[#F7CAC9]/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Cấu hình Firebase Realtime Database
              </h3>
              <p className="text-[10px] uppercase font-mono text-white/40 tracking-wider">
                Node Cluster Sync • Stage & Multi-client
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1.5 rounded-[2px] hover:bg-white/10 backdrop-blur-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status pill */}
        <div className="my-4 p-3 rounded-[2px] fluent-box-nested border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#B6A6D8]/40 backdrop-blur-md'
              }`}
            />
            <span className="font-medium text-white/80">
              {isConnected
                ? 'Đã kết nối trực tiếp Firebase RTDB Cloud'
                : 'Chế độ Cục bộ & Broadcast Sync Đa Tab (Không cần cài đặt)'}
            </span>
          </div>
          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="text-rose-400 hover:text-rose-300 underline font-mono text-[11px]"
            >
              Ngắt kết nối
            </button>
          )}
        </div>

        {statusMsg && (
          <div
            className={`p-3 mb-4 rounded-[2px] text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-white/10 backdrop-blur-md border border-emerald-500/40 text-emerald-300'
                : 'bg-white/10 backdrop-blur-md border border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div>
            <label
              htmlFor="input-firebase-url"
              className="block font-medium text-white/70 mb-1"
            >
              Firebase Database URL <span className="text-[#F7CAC9]">*</span>
            </label>
            <input
              id="input-firebase-url"
              type="text"
              placeholder="https://bti2026-default-rtdb.asia-southeast1.firebasedatabase.app"
              value={databaseURL}
              onChange={(e) => setDatabaseURL(e.target.value)}
              className="w-full fluent-box-nested border border-white/10 focus:border-[#F7CAC9] rounded-[2px] px-3.5 py-2.5 text-white font-mono placeholder-white/20 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="input-firebase-apikey"
                className="block font-medium text-white/70 mb-1"
              >
                API Key (Tùy chọn)
              </label>
              <input
                id="input-firebase-apikey"
                type="text"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full fluent-box-nested border border-white/10 focus:border-[#F7CAC9] rounded-[2px] px-3.5 py-2.5 text-white font-mono placeholder-white/20 outline-none transition"
              />
            </div>
            <div>
              <label
                htmlFor="input-firebase-projectid"
                className="block font-medium text-white/70 mb-1"
              >
                Project ID (Tùy chọn)
              </label>
              <input
                id="input-firebase-projectid"
                type="text"
                placeholder="beyond-the-internet-2026"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full fluent-box-nested border border-white/10 focus:border-[#F7CAC9] rounded-[2px] px-3.5 py-2.5 text-white font-mono placeholder-white/20 outline-none transition"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[2px] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-md transition"
            >
              Đóng
            </button>
            <button
              id="btn-save-firebase-config"
              type="submit"
              className="px-5 py-2.5 rounded-[2px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-[#0D0420]/30 transition"
            >
              <Save className="w-4 h-4" /> Lưu & Kết nối
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-white/40">
          <p className="font-semibold text-white/60 mb-1">
            Gợi ý bảo mật Firebase Rules (Công khai đọc/ghi trong giờ phát sóng):
          </p>
          <pre className="fluent-box-nested p-2.5 rounded-[2px] border border-white/5 font-mono text-[10px] text-emerald-400 overflow-x-auto">
{`{
  "rules": {
    "game_state": { ".read": true, ".write": true },
    "responses": { ".read": true, ".write": true },
    "presence": { ".read": true, ".write": true }
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
