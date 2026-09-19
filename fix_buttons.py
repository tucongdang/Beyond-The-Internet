import re

file_path = "src/components/AudienceView.tsx"

with open(file_path, "r") as f:
    content = f.read()

# 1. Insert pollStats
poll_stats_code = """    const timerProgress = Math.max(0, (timeLeft / (gameState.time_limit || 1)) * 100);

    const pollStats = useMemo(() => {
      if (!allResponses || !gameState.question_id) return { total: 0, percentages: {} };
      const responsesForQ = allResponses[gameState.question_id] || {};
      const total = Object.keys(responsesForQ).length;
      const counts: Record<string, number> = {};
      Object.values(responsesForQ).forEach(r => {
        const val = r.choice?.trim().toUpperCase();
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      const percentages: Record<string, number> = {};
      Object.keys(gameState.options || {}).forEach(k => {
        percentages[k] = total > 0 ? Math.round(((counts[k.toUpperCase()] || 0) / total) * 100) : 0;
      });
      return { total, percentages };
    }, [allResponses, gameState.question_id, gameState.options]);

"""
content = content.replace("    const timerProgress = Math.max(0, (timeLeft / (gameState.time_limit || 1)) * 100);", poll_stats_code)

# 2. Modify the options grid to add hasSelected
options_grid_start = """                  /* Options Grid */
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${isLongQuestion ? 'lg:grid-cols-4' : ''} gap-4 pt-1`}>
                    {Object.entries(gameState.options || {}).map(([key, label], idx) => {
                      const isSelected = selectedChoice.toUpperCase() === key.toUpperCase();
                      const isEliminated = gameState.eliminated_options?.includes(key);"""
options_grid_new = """                  /* Options Grid */
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${isLongQuestion ? 'lg:grid-cols-4' : ''} gap-4 pt-1`}>
                    {Object.entries(gameState.options || {}).map(([key, label], idx) => {
                      const isSelected = selectedChoice.toUpperCase() === key.toUpperCase();
                      const hasSelected = Boolean(selectedChoice);
                      const isEliminated = gameState.eliminated_options?.includes(key);
                      const pct = (timeLeft <= 0) ? (pollStats.percentages[key] || 0) : null;"""
content = content.replace(options_grid_start, options_grid_new)

# 3. Modify button class and inner content
btn_target = """                      return (
                        <button
                          key={key}
                          id={`btn-option-${key}`}
                          disabled={isEliminated || timeLeft <= 0}
                          onClick={() => handleOptionSelect(key)}
                          className={`relative w-full p-4 sm:p-5 rounded-[4px] text-left flex items-start gap-3.5 select-none overflow-hidden hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            isEliminated
                              ? 'opacity-30 fluent-box-nested line-through cursor-not-allowed border-white/5'
                              : isSelected
                              ? 'fluent-option-btn selected'
                              : 'fluent-option-btn'
                          }`}
                        >
                          {/* Subtle Progress Bar at the top of the button */}
                          {gameState.status === 'ACTIVE' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                              <div 
                                className={`h-full ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}
                                style={{ width: `${timerProgress}%`, transition: 'width 1s linear, background-color 0.3s ease' }}
                              />
                            </div>
                          )}
                          {/* Glow Overlay when selected */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-r from-[#F7CAC9]/20 via-white/10 to-transparent animate-pulse pointer-events-none" />
                          )}
                          {/* Option Key Badge with keyboard hint */}
                          <div className="flex flex-col items-center gap-1 shrink-0 relative z-10">
                            <div
                              className={`w-10 h-10 rounded-[4px] font-mono font-black text-base flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-[#F7CAC9] text-[#0D0420] shadow-[0_0_15px_rgba(247,202,201,0.8)]'
                                  : 'fluent-option-badge text-[#F7CAC9]'
                              }`}
                            >
                              {key}
                            </div>
                            {/* Hotkey Hint */}"""

btn_new = """                      return (
                        <button
                          key={key}
                          id={`btn-option-${key}`}
                          disabled={isEliminated || timeLeft <= 0}
                          onClick={() => handleOptionSelect(key)}
                          className={`relative w-full p-4 sm:p-5 rounded-[4px] text-left flex items-start gap-3.5 select-none overflow-hidden hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-all duration-300 ${
                            isEliminated
                              ? 'opacity-30 fluent-box-nested line-through cursor-not-allowed border-white/5'
                              : isSelected
                              ? 'fluent-option-btn selected border-[#F7CAC9] shadow-[0_0_15px_rgba(247,202,201,0.3)] animate-pulse'
                              : hasSelected
                              ? 'fluent-option-btn opacity-40 hover:opacity-70'
                              : 'fluent-option-btn'
                          }`}
                        >
                          {/* Percentage Overlay when time is up */}
                          {pct !== null && (
                            <div className="absolute top-0 bottom-0 left-0 bg-[#F7CAC9]/15 z-0 transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                          )}
                          
                          {/* Subtle Progress Bar at the top of the button */}
                          {gameState.status === 'ACTIVE' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                              <div 
                                className={`h-full ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}
                                style={{ width: `${timerProgress}%`, transition: 'width 1s linear, background-color 0.3s ease' }}
                              />
                            </div>
                          )}
                          
                          {/* Checkmark indicator for selected (Top Right of Button) */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 text-[#F7CAC9] z-20 drop-shadow-md animate-fadeIn">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                          
                          {/* Glow Overlay when selected */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-r from-[#F7CAC9]/20 via-white/10 to-transparent pointer-events-none" />
                          )}
                          {/* Option Key Badge with keyboard hint */}
                          <div className="flex flex-col items-center gap-1 shrink-0 relative z-10">
                            <div
                              className={`w-10 h-10 rounded-[4px] font-mono font-black text-base flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-[#F7CAC9] text-[#0D0420] shadow-[0_0_15px_rgba(247,202,201,0.8)]'
                                  : 'fluent-option-badge text-[#F7CAC9]'
                              }`}
                            >
                              {key}
                            </div>
                            {/* Hotkey Hint */}"""
content = content.replace(btn_target, btn_new)

with open(file_path, "w") as f:
    f.write(content)
print("AudienceView updated.")
