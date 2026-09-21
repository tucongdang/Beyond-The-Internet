import React, { useState, useEffect } from 'react';
import { Volume2, Volume1, VolumeX, Play, AlertCircle, Bell, Music, Check, X, Clock, Zap, Heart, Flame, RotateCcw, Sparkles, Activity, Sliders, Mic } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { aiExplanationService } from '../services/aiExplanationService';
import { cheerService } from '../services/cheerService';
import { CheerIntensityData } from '../types';

export const SoundFxAdmin: React.FC = () => {
  const [cheerData, setCheerData] = useState<CheerIntensityData>(cheerService.getCurrentIntensityData());
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [sfxVolume, setSfxVolume] = useState<number>(() => soundFx.getVolume());
  const [ttsVolume, setTtsVolume] = useState<number>(() => aiExplanationService.getTtsVolume());
  const [ttsPitch, setTtsPitch] = useState<number>(() => aiExplanationService.getTtsPitch());
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => aiExplanationService.getSelectedVoiceURI());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
      setAvailableVoices(aiExplanationService.getAvailableVoices());
    };
    updateVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    const unsub = cheerService.subscribe(setCheerData);
    const unsubSfx = soundFx.subscribeVolume((vol) => setSfxVolume(vol));
    const unsubTts = aiExplanationService.subscribeTtsVolume((vol) => setTtsVolume(vol));
    const unsubPitch = aiExplanationService.subscribeTtsPitch((pitch) => setTtsPitch(pitch));
    const unsubVoice = aiExplanationService.subscribeSelectedVoice((uri) => setSelectedVoiceURI(uri));
    return () => {
      unsub();
      unsubSfx();
      unsubTts();
      unsubPitch();
      unsubVoice();
    };
  }, []);

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVolume(val);
    soundFx.setVolume(val);
  };

  const handleTtsVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTtsVolume(val);
    aiExplanationService.setTtsVolume(val);
  };

  const handleTtsPitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTtsPitch(val);
    aiExplanationService.setTtsPitch(val);
  };

  const handleVoiceSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVoiceURI(val);
    aiExplanationService.setSelectedVoiceURI(val);
  };
  return (
    <div className="fluent-box border border-white/10 rounded-[2px] p-6 space-y-6 text-white shadow-2xl">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-[2px] fluent-box border border-[#F7CAC9]/40 text-[#F7CAC9] flex items-center justify-center shadow-md">
          <Volume2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-wider font-mono">SOUND FX & AI VOICE CONTROL</h2>
          <p className="text-white/50 text-xs mt-0.5">Điều khiển hiệu ứng âm thanh và âm lượng giọng đọc AI trực tiếp trên Admin.</p>
        </div>
      </div>

      {/* Volume & Tone Control Sliders Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-[2px] fluent-box-nested border border-white/10 bg-white/5">
        {/* Sound FX Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-sky-400" />
              <span className="text-white font-bold">Sound FX Volume</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-[1px] bg-sky-500/20 text-sky-300 border border-sky-400/30">
              {Math.round(sfxVolume * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sfxVolume}
              onChange={handleSfxVolumeChange}
              className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-sky-400"
            />
            <button
              type="button"
              onClick={() => soundFx.playTing()}
              className="px-2.5 py-1 text-[11px] font-mono rounded-[2px] bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 shrink-0 cursor-pointer"
            >
              Test SFX
            </button>
          </div>
        </div>

        {/* TTS Voice Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">AI Voice Volume</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-[1px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {Math.round(ttsVolume * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={ttsVolume}
              onChange={handleTtsVolumeChange}
              className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-emerald-400"
            />
            <button
              type="button"
              onClick={() => {
                aiExplanationService.speakQuestionText(
                  `Thử nghiệm giọng đọc AI với cao độ ${ttsPitch.toFixed(2)}.`,
                  'vi'
                );
              }}
              className="px-2.5 py-1 text-[11px] font-mono rounded-[2px] bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 shrink-0 cursor-pointer"
            >
              Test TTS
            </button>
          </div>
        </div>

        {/* TTS Voice Pitch */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-400" />
              <span className="text-white font-bold">AI Voice Pitch</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded-[1px] bg-purple-500/20 text-purple-300 border border-purple-400/30">
                {ttsPitch.toFixed(2)}x
              </span>
              {ttsPitch !== 1.0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTtsPitch(1.0);
                    aiExplanationService.setTtsPitch(1.0);
                  }}
                  className="p-1 rounded-[1px] bg-white/10 hover:bg-white/20 text-white/70"
                  title="Reset 1.0x"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/40">0.5x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={ttsPitch}
              onChange={handleTtsPitchChange}
              className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-purple-400"
            />
            <span className="text-[10px] font-mono text-white/40">2.0x</span>
          </div>
        </div>

        {/* System Voice Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">System Voice</span>
            </div>
            <span className="text-[10px] font-mono text-white/50">
              {availableVoices.length > 0 ? `${availableVoices.length} voices` : '0'}
            </span>
          </div>
          <div className="relative">
            <select
              value={selectedVoiceURI}
              onChange={handleVoiceSelectChange}
              className="w-full text-xs font-mono bg-black/40 border border-white/15 rounded-[2px] px-2 py-1.5 text-white/90 focus:outline-none focus:border-emerald-400 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2334d399' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.25em 1.25em`, paddingRight: `2rem` }}
            >
              <option value="auto" className="bg-slate-900 text-white">
                Auto (Language Default)
              </option>
              {availableVoices.map((voice) => (
                <option
                  key={voice.voiceURI || voice.name}
                  value={voice.voiceURI || voice.name}
                  className="bg-slate-900 text-white"
                >
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Play Click */}
        <button
          onClick={() => soundFx.playClick()}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-white/10 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <Play className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-white font-mono">Click / Chọn</span>
        </button>

        {/* Play Error */}
        <button
          onClick={() => soundFx.playError()}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-rose-500/30 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <AlertCircle className="w-6 h-6 text-rose-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-rose-200 font-mono">Báo Lỗi (Error)</span>
        </button>

        {/* Play Tick Normal */}
        <button
          onClick={() => soundFx.playTick(false)}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-white/10 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <Clock className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-white font-mono">Tick (Bình thường)</span>
        </button>

        {/* Play Tick Urgent */}
        <button
          onClick={() => soundFx.playTick(true)}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-amber-500/30 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <Zap className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-amber-300 font-mono">Tick (Khẩn cấp)</span>
        </button>

        {/* Play Lock */}
        <button
          onClick={() => soundFx.playLock()}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-red-500/30 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <X className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-red-300 font-mono">Khóa / Hết Giờ (Gong)</span>
        </button>

        {/* Play Reveal Correct */}
        <button
          onClick={() => soundFx.playReveal(true)}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-emerald-500/30 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <Check className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-emerald-300 font-mono">Đúng (Fanfare)</span>
        </button>

        {/* Play Reveal Incorrect */}
        <button
          onClick={() => soundFx.playReveal(false)}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-white/10 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <X className="w-6 h-6 text-white/60 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-white font-mono">Sai / Reveal Neutral</span>
        </button>

        {/* Play Start Round */}
        <button
          onClick={() => soundFx.playStartRound()}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-purple-500/30 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <Music className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-purple-300 font-mono">Bắt đầu Vòng (Swoosh)</span>
        </button>

        {/* Play Notification */}
        <button
          onClick={() => soundFx.playNotification()}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-cyan-500/30 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <Bell className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-cyan-300 font-mono">Thông báo Poll (Chime)</span>
        </button>

        {/* Play Drumroll */}
        <button
          onClick={() => soundFx.playDrumroll()}
          className="flex flex-col items-center justify-center p-4 fluent-box-nested hover:bg-white/15 border border-orange-500/30 rounded-[2px] transition gap-3 cursor-pointer group"
        >
          <Volume2 className="w-6 h-6 text-orange-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-orange-300 font-mono">Hồi Hộp (Drumroll)</span>
        </button>

        {/* Pacing Chimes */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-white/10 mt-2">
          <button
            onClick={() => soundFx.playPacingChime('low')}
            className="p-3 fluent-box-nested hover:bg-white/15 border border-white/10 rounded-[2px] text-xs font-bold text-white transition font-mono cursor-pointer"
          >
            Pacing Chime: Low
          </button>
          <button
            onClick={() => soundFx.playPacingChime('medium')}
            className="p-3 fluent-box-nested hover:bg-white/15 border border-white/10 rounded-[2px] text-xs font-bold text-white transition font-mono cursor-pointer"
          >
            Pacing Chime: Medium
          </button>
          <button
            onClick={() => soundFx.playPacingChime('high')}
            className="p-3 fluent-box-nested hover:bg-white/15 border border-white/10 rounded-[2px] text-xs font-bold text-white transition font-mono cursor-pointer"
          >
            Pacing Chime: High
          </button>
          <button
            onClick={() => soundFx.playPacingChime('complete')}
            className="p-3 fluent-box-nested hover:bg-white/15 border border-white/10 rounded-[2px] text-xs font-bold text-white transition font-mono cursor-pointer"
          >
            Pacing Chime: Complete
          </button>
        </div>
      </div>

      {/* Audience Cheer & Heartbeat Control Deck */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-400 fill-current animate-pulse" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              Audience Cheer & Live Heartbeat Deck
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded-[2px] fluent-box-nested text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              {cheerData.bpm} BPM
            </span>
            <span className="px-2 py-0.5 rounded-[2px] fluent-box-nested text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {cheerData.totalCheers} Cheers
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Test Heartbeat Audio */}
          <button
            type="button"
            onClick={() => soundFx.playHeartbeat(cheerData.intensity / 100)}
            className="p-3.5 rounded-[2px] fluent-box-nested hover:bg-white/15 border border-rose-500/30 text-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer font-mono"
          >
            <Heart className="w-4 h-4 text-rose-400 fill-current" />
            <span>Thử Âm Heartbeat (Lub-Dub)</span>
          </button>

          {/* Trigger Mega Cheer Burst */}
          <button
            type="button"
            onClick={() => cheerService.triggerMegaCheer({ uid: 'host_burst', name: 'MC / Host' })}
            className="p-3.5 rounded-[2px] fluent-box-nested hover:bg-white/15 border border-amber-500/30 text-amber-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer font-mono"
          >
            <Flame className="w-4 h-4 text-amber-400 fill-current" />
            <span>Kích Hoạt Mega Cheer Burst 🔥</span>
          </button>

          {/* Reset Total Cheers */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="p-3.5 rounded-[2px] fluent-box-nested hover:bg-white/15 border border-white/10 text-white/70 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer font-mono"
          >
            <RotateCcw className="w-4 h-4 text-white/50" />
            <span>Reset Bộ Đếm Cheers</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full fluent-box border border-rose-500/30 rounded-[2px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg font-mono">Xác nhận Reset?</h3>
            <p className="text-white/70 text-sm mt-2">
              Bạn có chắc muốn đặt lại bộ đếm Lượt Cổ Vũ về 0 không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-[2px] fluent-box-nested hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  cheerService.resetTotalCheers();
                  setIsResetConfirmOpen(false);
                }}
                className="px-4 py-2 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg cursor-pointer"
              >
                Đồng ý Reset
              </button>
            </div>
          </div>
        </div>
      )}

      
      <div className="mt-4 text-[10px] sm:text-xs text-white/50 italic flex items-start gap-2 fluent-box-nested p-3 rounded-[2px] border border-white/10">
        💡 Lưu ý: Trình duyệt có thể yêu cầu bạn phải tương tác (click) vào trang web ít nhất một lần để cấp quyền phát âm thanh.
      </div>
    </div>
  );
};
