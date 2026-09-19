const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

const statsLogic = `  // Calculate vote statistics for Reveal state
  const tfStats = useMemo(() => {
    if (gameState.round_type !== 'TRUE_FALSE_4') return null;
    const counts: Record<string, { D: number; S: number; total: number }> = {};
    Object.keys(gameState.options || {}).forEach(k => {
      counts[k] = { D: 0, S: 0, total: 0 };
    });

    (Object.values(responses || {}) as UserResponse[]).forEach(r => {
      if (!r.choice) return;
      const parts = r.choice.split(',');
      parts.forEach(part => {
        const [k, v] = part.split(':');
        if (k && counts[k]) {
          const val = v ? v.trim().toUpperCase() : '';
          if (val === 'Đ' || val === 'T') {
            counts[k].D += 1;
            counts[k].total += 1;
          } else if (val === 'S' || val === 'F') {
            counts[k].S += 1;
            counts[k].total += 1;
          }
        }
      });
    });
    return counts;
  }, [gameState.round_type, responses, gameState.options]);

  const shortStats = useMemo(() => {
    const isShort = gameState.round_type === 'SHORT_ANSWER' || gameState.round_type === 'FILL_IN_BLANK' || gameState.round_type === 'SEQUENCING';
    const isVcnv = gameState.round_type === 'VCNV' || gameState.question_id?.startsWith('VCNV');
    if (!isShort && !isVcnv) return null;
    const groups: Record<string, { count: number; raw: string }> = {};
    let totalValid = 0;
    (Object.values(responses || {}) as UserResponse[]).forEach(r => {
      if (!r.choice) return;
      const val = r.choice.trim().toUpperCase();
      if (!val) return;
      if (!groups[val]) groups[val] = { count: 0, raw: val };
      groups[val].count += 1;
      totalValid += 1;
    });

    const list = Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 10);
    return { list, total: totalValid };
  }, [gameState.round_type, responses]);

  const voteStats = useMemo(() => {`;

code = code.replace('  // Calculate vote statistics for Reveal state\n  const voteStats = useMemo(() => {', statsLogic);

const chartLogic = `        {/* Audience Voting Percentage Bar Chart */}
        <div className="fluent-box rounded-[4px] p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-200 text-sm font-bold">
              <BarChart3 className="w-4 h-4 text-[#F7CAC9]" />
              Tỷ lệ Bình chọn của Toàn bộ Khán giả
            </div>
            <span className="text-xs font-mono text-[#B6A6D8]">
              Tổng số vote: <strong>{voteStats.totalVotes}</strong>
            </span>
          </div>
          
          <div className="space-y-3">
            {gameState.round_type === 'TRUE_FALSE_4' && tfStats ? (
              Object.entries(gameState.options || {}).map(([key, label]) => {
                const stat = tfStats[key] || { D: 0, S: 0, total: 0 };
                const totalStatementVotes = stat.total;
                const percentD = totalStatementVotes > 0 ? Math.round((stat.D / totalStatementVotes) * 100) : 0;
                const percentS = totalStatementVotes > 0 ? Math.round((stat.S / totalStatementVotes) * 100) : 0;
                
                return (
                  <div key={key} className="space-y-2 p-3 bg-black/40 rounded-[4px] border border-white/5">
                    <div className="text-xs text-[#B6A6D8] font-medium leading-relaxed break-words">
                      <span className="font-mono font-bold text-white px-1.5 py-0.5 rounded-[4px] bg-white/10 mr-1.5">{key}</span>
                      {label}
                    </div>
                    
                    <div className="flex gap-2 w-full h-4 rounded-[4px] overflow-hidden bg-[#0D0420]/50 border border-white/10 p-0.5">
                      {percentD > 0 && (
                        <div 
                          className="h-full rounded-[2px] bg-emerald-400/80 transition-all duration-700 flex items-center justify-center overflow-hidden"
                          style={{ width: \`\${percentD}%\` }}
                        >
                          {percentD > 15 && <span className="text-[9px] font-mono text-emerald-950 font-bold px-1">ĐÚNG {percentD}%</span>}
                        </div>
                      )}
                      {percentS > 0 && (
                        <div 
                          className="h-full rounded-[2px] bg-rose-400/80 transition-all duration-700 flex items-center justify-center overflow-hidden"
                          style={{ width: \`\${percentS}%\` }}
                        >
                          {percentS > 15 && <span className="text-[9px] font-mono text-rose-950 font-bold px-1">SAI {percentS}%</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-white/50">
                      <span>Đúng: {stat.D} phiếu</span>
                      <span>Sai: {stat.S} phiếu</span>
                    </div>
                  </div>
                );
              })
            ) : (gameState.round_type === 'SHORT_ANSWER' || gameState.round_type === 'FILL_IN_BLANK' || gameState.round_type === 'SEQUENCING' || gameState.round_type === 'VCNV') && shortStats ? (
              shortStats.list.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-4 font-mono">Đang chờ câu trả lời...</div>
              ) : (
                <div className="space-y-2">
                  {shortStats.list.map((item, idx) => {
                    const percent = shortStats.total > 0 ? Math.round((item.count / shortStats.total) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-start justify-between text-xs gap-3">
                          <div className="flex items-start gap-1.5 flex-1 min-w-0">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded-[4px] shrink-0 mt-0.5 bg-white/10 text-white">
                              {item.raw}
                            </span>
                            {item.raw === userChoice && (
                              <span className="text-[10px] bg-[#F7CAC9]/20 text-[#FCEEEC] px-1.5 py-0.5 rounded-[4px] shrink-0 mt-0.5">
                                Bạn chọn
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[#B6A6D8] shrink-0 mt-0.5">
                            {item.count} phiếu ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-3 bg-[#0D0420]/50 rounded-[4px] overflow-hidden p-0.5 border border-white/10">
                          <div
                            className="h-full rounded-[2px] transition-all duration-700 bg-amber-400"
                            style={{ width: \`\${percent}%\` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              Object.entries(gameState.options || {}).map(([key, label]) => {
                const count = voteStats.counts[key] || 0;
                const percent = voteStats.totalVotes > 0
                  ? Math.round((count / voteStats.totalVotes) * 100)
                  : 0;
                const isOfficialKey = key.toUpperCase() === correctKey;
                const isUserPick = key.toUpperCase() === userChoice;

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-start justify-between text-xs gap-3">
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <span
                          className={\`font-mono font-bold px-1.5 py-0.5 rounded-[4px] shrink-0 mt-0.5 \${
                            isOfficialKey
                              ? 'bg-white/10 text-emerald-400 border border-emerald-500/40'
                              : 'fluent-box-nested text-[#B6A6D8]'
                          }\`}
                        >
                          {key}
                        </span>
                        <span className="text-[#B6A6D8] font-medium leading-relaxed break-words">
                          {label}
                        </span>
                        {isUserPick && (
                          <span className="text-[10px] bg-[#F7CAC9]/20 text-[#FCEEEC] px-1.5 py-0.5 rounded-[4px] shrink-0 mt-0.5">
                            Bạn chọn
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[#B6A6D8] shrink-0 mt-0.5">
                        {count} phiếu ({percent}%)
                      </span>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full h-3 bg-[#0D0420]/50 rounded-[4px] overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={\`h-full rounded-[2px] transition-all duration-700 \${
                          isOfficialKey
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                            : isUserPick
                            ? 'bg-[#F7CAC9]'
                            : 'bg-[#3E1D74]/70'
                        }\`}
                        style={{ width: \`\${percent}%\` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>`;

const searchString = `        {/* Audience Voting Percentage Bar Chart */}
        <div className="fluent-box rounded-[4px] p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-200 text-sm font-bold">
              <BarChart3 className="w-4 h-4 text-[#F7CAC9]" />
              Tỷ lệ Bình chọn của Toàn bộ Khán giả
            </div>
            <span className="text-xs font-mono text-[#B6A6D8]">
              Tổng số vote: <strong>{voteStats.totalVotes}</strong>
            </span>
          </div>
          <div className="space-y-3">
            {Object.entries(gameState.options || {}).map(([key, label]) => {
              const count = voteStats.counts[key] || 0;
              const percent = voteStats.totalVotes > 0
                ? Math.round((count / voteStats.totalVotes) * 100)
                : 0;
              const isOfficialKey = key.toUpperCase() === correctKey;
              const isUserPick = key.toUpperCase() === userChoice;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-start justify-between text-xs gap-3">
                    <div className="flex items-start gap-1.5 flex-1 min-w-0">
                      <span
                        className={\`font-mono font-bold px-1.5 py-0.5 rounded-[4px] shrink-0 mt-0.5 \${
                          isOfficialKey
                            ? 'bg-white/10 text-emerald-400 border border-emerald-500/40'
                            : 'fluent-box-nested text-[#B6A6D8]'
                        }\`}
                      >
                        {key}
                      </span>
                      <span className="text-[#B6A6D8] font-medium leading-relaxed break-words">
                        {label}
                      </span>
                      {isUserPick && (
                        <span className="text-[10px] bg-[#F7CAC9]/20 text-[#FCEEEC] px-1.5 py-0.5 rounded-[4px] shrink-0 mt-0.5">
                          Bạn chọn
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[#B6A6D8] shrink-0 mt-0.5">
                      {count} phiếu ({percent}%)
                    </span>
                  </div>
                  {/* Visual Bar */}
                  <div className="w-full h-3 bg-[#0D0420]/50 rounded-[4px] overflow-hidden p-0.5 border border-white/10">
                    <div
                      className={\`h-full rounded-[2px] transition-all duration-700 \${
                        isOfficialKey
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                          : isUserPick
                          ? 'bg-[#F7CAC9]'
                          : 'bg-[#3E1D74]/70'
                      }\`}
                      style={{ width: \`\${percent}%\` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>`;

code = code.replace(searchString, chartLogic);

fs.writeFileSync('src/components/AudienceView.tsx', code);
