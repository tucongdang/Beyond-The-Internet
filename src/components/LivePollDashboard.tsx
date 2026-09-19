import React, { useMemo } from 'react';
import { GameState, UserResponse } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Users, AlertOctagon, Timer, CheckCircle2, Sparkles, BarChart3, Radio } from 'lucide-react';

interface LivePollDashboardProps {
  gameState: GameState;
  allResponses: Record<string, Record<string, UserResponse>>;
  activeAudienceCount: number;
}

export const LivePollDashboard: React.FC<LivePollDashboardProps> = ({
  gameState,
  allResponses,
  activeAudienceCount
}) => {
  const currentPoll = gameState.emergency_poll;

  const data = useMemo(() => {
    if (!currentPoll) return [];

    const pollResponsesMap = allResponses?.[`EMERGENCY_POLL_${currentPoll.id}`] || {};
    const votes = Object.values(pollResponsesMap) as UserResponse[];

    let countA = 0;
    let countB = 0;

    votes.forEach(vote => {
      if (vote.choice === 'A') countA++;
      if (vote.choice === 'B') countB++;
    });

    return [
      { name: `A: ${currentPoll.options.A}`, value: countA, color: '#10b981', shortName: 'Lựa chọn A', key: 'A', text: currentPoll.options.A },
      { name: `B: ${currentPoll.options.B}`, value: countB, color: '#f43f5e', shortName: 'Lựa chọn B', key: 'B', text: currentPoll.options.B }
    ];
  }, [currentPoll, allResponses]);

  if (!currentPoll || currentPoll.status === 'DISMISSED') {
    return null;
  }

  const totalVotes = data.reduce((sum, item) => sum + item.value, 0);
  const participationRate = activeAudienceCount > 0 ? Math.min(100, Math.round((totalVotes / activeAudienceCount) * 100)) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = totalVotes > 0 ? Math.round((item.value / totalVotes) * 100) : 0;
      return (
        <div className="fluent-box-nested p-3 rounded-[4px] border border-white/20 shadow-2xl backdrop-blur-xl text-white font-mono space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-bold text-xs text-white">{item.shortName}</span>
          </div>
          <p className="text-[11px] text-white/70 font-sans max-w-[220px] truncate">{item.text}</p>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/10 text-xs">
            <span className="font-black" style={{ color: item.color }}>{item.value} phiếu</span>
            <span className="text-white/60 font-bold">{pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fluent-box rounded-[4px] p-4 sm:p-6 shadow-2xl mb-4 relative overflow-hidden border border-white/15 text-white animate-fadeIn transition-all duration-380 select-none">
      {/* Decorative ambient top glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#F7CAC9]/60 to-transparent pointer-events-none" />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[4px] fluent-box-nested border border-[#F7CAC9]/40 flex items-center justify-center text-[#F7CAC9] shadow-md relative">
            <Activity className="w-4 h-4 text-[#F7CAC9]" />
            {currentPoll.status === 'ACTIVE' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>RESULTS OVERVIEW</span>
              </h2>
              {currentPoll.status === 'ACTIVE' && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-[2px] animate-pulse">
                  LIVE STREAM
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/50 font-mono">Live Vote Distribution & Audience Telemetry</p>
          </div>
        </div>

        {/* Status badges & Participation rate */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-[4px] text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
            currentPoll.status === 'ACTIVE'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-900/30'
              : currentPoll.status === 'LOCKED'
              ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-900/30'
              : 'bg-purple-950/60 text-purple-200 border-purple-500/40 shadow-sm shadow-purple-900/30'
          }`}>
            {currentPoll.status === 'ACTIVE' && <Timer className="w-3.5 h-3.5 animate-spin" />}
            {currentPoll.status === 'LOCKED' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {currentPoll.status === 'REVEALED' && <AlertOctagon className="w-3.5 h-3.5 text-[#F7CAC9]" />}
            <span>
              {currentPoll.status === 'ACTIVE' ? 'ĐANG NHẬN VOTE' : currentPoll.status === 'LOCKED' ? 'ĐÃ KHÓA BÌNH CHỌN' : 'ĐÃ CÔNG BỐ'}
            </span>
          </span>

          <span className="px-3 py-1 rounded-[4px] text-[11px] font-mono font-bold fluent-box-nested text-white/80 border border-white/10 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>{totalVotes} / {activeAudienceCount} tham gia ({participationRate}%)</span>
          </span>
        </div>
      </div>

      {/* Grid Layout: Left Question & Interactive Bars / Right Donut Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left column: Question & Option Cards with Animated Progress Bars */}
        <div className="md:col-span-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
              <Radio className="w-3 h-3 text-amber-400" />
              <span>CÂU HỎI HIỆN TẠI</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white leading-relaxed tracking-wide">
              "{currentPoll.question}"
            </p>
          </div>

          {/* Option Telemetry Cards */}
          <div className="space-y-2.5 pt-1">
            {data.map((item, index) => {
              const pct = totalVotes > 0 ? Math.round((item.value / totalVotes) * 100) : 0;
              const isOptionA = item.key === 'A';

              return (
                <div
                  key={index}
                  className="fluent-box-nested rounded-[4px] border border-white/10 p-3 relative overflow-hidden transition-all duration-300 hover:border-white/25 hover:translate-y-[-1px] group"
                >
                  {/* Background Progress Fill Bar */}
                  <div
                    className="absolute top-0 bottom-0 left-0 transition-all duration-500 ease-out opacity-20 pointer-events-none"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.color
                    }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-125 shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white/90 group-hover:text-white flex items-center gap-1.5">
                          <span className="font-mono" style={{ color: item.color }}>[{item.key}]</span>
                          <span className="truncate">{item.text || item.shortName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 font-mono">
                      <div className="text-xs sm:text-sm font-black tracking-tight" style={{ color: item.color }}>
                        {item.value} <span className="text-[10px] font-normal text-white/60 font-sans">phiếu</span>
                      </div>
                      <div className="text-[10px] text-white/50 font-bold">
                        {pct}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Dynamic Donut Chart or Interactive Telemetry Radar Empty State */}
        <div className="md:col-span-6 min-h-[220px] sm:min-h-[240px] flex items-center justify-center">
          {totalVotes > 0 ? (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="46%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    animationDuration={600}
                    animationEasing="cubic-bezier(0.13, 0.77, 0.32, 0.99)"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-mono text-white/80">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total Indicator in Donut */}
              <div className="absolute top-[36%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-base sm:text-lg font-mono font-black text-white">{totalVotes}</div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-white/50">Phiếu bầu</div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center border border-dashed border-white/15 rounded-[4px] fluent-box-nested p-6 text-center relative overflow-hidden group">
              {/* Pulsing radar waves */}
              <div className="relative mb-3 flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full bg-white/5 animate-ping opacity-50" />
                <div className="w-10 h-10 rounded-[4px] fluent-box border border-white/10 flex items-center justify-center text-white/40 group-hover:text-[#F7CAC9] transition-colors">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <p className="text-xs font-bold text-white/70 mb-1">Chưa có dữ liệu bình chọn</p>
              <p className="text-[10px] font-mono text-white/40 max-w-[260px] leading-normal">
                {currentPoll.status === 'ACTIVE'
                  ? 'Đang chờ khán giả quét mã QR và gửi lựa chọn bình chọn trực tiếp...'
                  : 'Khảo sát chưa mở hoặc chưa nhận được phản hồi từ hội trường.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

