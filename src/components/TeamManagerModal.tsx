import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { GameState } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

interface TeamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

export const TeamManagerModal: React.FC<TeamManagerModalProps> = ({
  isOpen,
  onClose,
  gameState
}) => {
  const [teams, setTeams] = useState<Array<{ id: string, name: string, color: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      setTeams(gameState.teams ? JSON.parse(JSON.stringify(gameState.teams)) : []);
    }
  }, [isOpen, gameState.teams]);

  if (!isOpen) return null;

  const handleSave = () => {
    vibrateSuccess();
    soundFx.playSuccess();
    syncService.updateGameState({ teams });
    onClose();
  };

  const updateTeam = (index: number, field: 'name' | 'color', value: string) => {
    const newTeams = [...teams];
    newTeams[index][field] = value;
    setTeams(newTeams);
  };

  const addTeam = () => {
    const newId = `team_${Date.now()}`;
    const defaultColors = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6'];
    const color = defaultColors[teams.length % defaultColors.length];
    setTeams([...teams, { id: newId, name: `Đội ${teams.length + 1}`, color }]);
  };

  const removeTeam = (index: number) => {
    const newTeams = [...teams];
    newTeams.splice(index, 1);
    setTeams(newTeams);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#190839] border border-white/20 rounded-[8px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Quản Lý Danh Sách Đội
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          {teams.length === 0 ? (
            <div className="text-center text-white/50 py-8">Chưa có đội nào. Hãy thêm đội mới.</div>
          ) : (
            teams.map((team, idx) => (
              <div key={team.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-[4px] border border-white/10">
                <div 
                  className="w-10 h-10 rounded-full shrink-0 border-2 border-white/20 flex items-center justify-center font-bold text-white shadow-inner"
                  style={{ backgroundColor: team.color }}
                >
                  {idx + 1}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-[10px] text-white/50 uppercase font-bold tracking-wider mb-1 block">Tên Đội</label>
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => updateTeam(idx, 'name', e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-[4px] px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                      placeholder="VD: Đội Sư Tử"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/50 uppercase font-bold tracking-wider mb-1 block">Màu Sắc (Mã HEX)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={team.color}
                        onChange={(e) => updateTeam(idx, 'color', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={team.color}
                        onChange={(e) => updateTeam(idx, 'color', e.target.value)}
                        className="flex-1 bg-black/40 border border-white/20 rounded-[4px] px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => removeTeam(idx)}
                  className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-[4px] transition shrink-0"
                  title="Xóa đội này"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
          
          <button
            onClick={addTeam}
            className="w-full py-3 flex items-center justify-center gap-2 text-sky-400 border border-dashed border-sky-500/30 rounded-[4px] hover:bg-sky-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-bold">Thêm Đội Mới</span>
          </button>
        </div>
        
        <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[4px] text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-[4px] text-sm font-bold bg-sky-500 text-white hover:bg-sky-400 transition flex items-center gap-2 shadow-lg shadow-sky-500/20"
          >
            <Save className="w-4 h-4" />
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
};
