import re

file_path = "src/components/EmergencyPollAudience.tsx"

with open(file_path, "r") as f:
    content = f.read()

# 1. Insert pollStats
poll_stats_code = """  const isLocked = poll?.status === 'LOCKED';
  const isRevealed = poll?.status === 'REVEAL';

  const pollStats = React.useMemo(() => {
    if (!pollResponses || !poll?.options) return { total: 0, percentages: {} };
    const total = Object.keys(pollResponses).length;
    const counts: Record<string, number> = {};
    Object.values(pollResponses).forEach(r => {
      const val = r.choice?.trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    const percentages: Record<string, number> = {};
    poll.options.forEach(opt => {
      percentages[opt.key] = total > 0 ? Math.round(((counts[opt.key] || 0) / total) * 100) : 0;
    });
    return { total, percentages };
  }, [pollResponses, poll?.options]);
"""

content = content.replace("  const isLocked = poll?.status === 'LOCKED';\n  const isRevealed = poll?.status === 'REVEAL';", poll_stats_code)

btn_target = """            const isSelected = selectedChoice === item.key;
            const isCorrect = poll.correct_option === item.key;

            return (
              <button
                key={item.key}
                type="button"
                disabled={!isVotingActive}
                onClick={() => handleVote(item.key)}
                className={`p-4 sm:p-5 rounded-[4px] border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group active:scale-95 disabled:cursor-not-allowed cursor-pointer ${
                  isSelected
                    ? 'fluent-option-btn selected'
                    : !isVotingActive
                    ? 'fluent-box-nested opacity-60'
                    : 'fluent-option-btn'
                }`}
                style={{
                  backgroundColor: isSelected ? `${item.color}35` : undefined,
                  borderColor: isSelected ? item.color : undefined,
                  boxShadow: isSelected ? `0 0 25px ${item.color}80, inset 0 0 15px ${item.color}40` : undefined,
                  outlineColor: isSelected ? item.color : undefined
                }}
              >
                {/* Subdued Progress Bar at the top of the button */}
                {poll.time_limit > 0 && poll.status === 'ACTIVE' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                    <div 
                      className={`h-full ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}
                      style={{ width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%`, transition: 'width 1s linear, background-color 0.3s ease' }}
                    />
                  </div>
                )}"""

btn_new = """            const isSelected = selectedChoice === item.key;
            const hasSelected = Boolean(selectedChoice);
            const isCorrect = poll.correct_option === item.key;
            const pct = (timeLeft <= 0 || !isVotingActive) ? (pollStats.percentages[item.key] || 0) : null;

            return (
              <button
                key={item.key}
                type="button"
                disabled={!isVotingActive}
                onClick={() => handleVote(item.key)}
                className={`p-4 sm:p-5 rounded-[4px] border text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between group active:scale-95 disabled:cursor-not-allowed cursor-pointer ${
                  isSelected
                    ? 'fluent-option-btn selected animate-pulse scale-[1.02] z-10'
                    : !isVotingActive
                    ? 'fluent-box-nested opacity-60'
                    : hasSelected
                    ? 'fluent-option-btn opacity-40 hover:opacity-70 scale-95'
                    : 'fluent-option-btn'
                }`}
                style={{
                  backgroundColor: isSelected ? `${item.color}35` : undefined,
                  borderColor: isSelected ? item.color : undefined,
                  boxShadow: isSelected ? `0 0 25px ${item.color}80, inset 0 0 15px ${item.color}40` : undefined,
                  outlineColor: isSelected ? item.color : undefined
                }}
              >
                {/* Percentage Overlay when time is up */}
                {pct !== null && (
                  <div className="absolute top-0 bottom-0 left-0 z-0 transition-all duration-1000 ease-out opacity-20" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                )}
                
                {/* Checkmark indicator for selected (Top Right of Button) */}
                {isSelected && (
                  <div className="absolute top-3 right-3 z-20 drop-shadow-md animate-fadeIn" style={{ color: item.color }}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                
                {/* Subdued Progress Bar at the top of the button */}
                {poll.time_limit > 0 && poll.status === 'ACTIVE' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                    <div 
                      className={`h-full ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}
                      style={{ width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%`, transition: 'width 1s linear, background-color 0.3s ease' }}
                    />
                  </div>
                )}"""

content = content.replace(btn_target, btn_new)

with open(file_path, "w") as f:
    f.write(content)
print("EmergencyPollAudience updated.")
