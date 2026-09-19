const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

const oldBlock = `{hasVotedThisQuestion && (
                <div className="p-3.5 rounded-[4px] fluent-box-nested text-xs text-[#FCEEEC] flex items-center justify-between mt-2 shadow-inner">
                  <span className="flex items-center gap-2">
                    {isPendingSync ? <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-[#F7CAC9]" />} {isPendingSync ? 'Đang đồng bộ...' : 'Bạn đang chọn:'} <strong className="text-white font-mono text-sm">[{selectedChoice}]</strong>
                  </span>
                  <span className="text-[11px] text-[#B6A6D8] italic">
                    Có thể đổi đáp án trước khi hết giờ (bấm 1-4 trên bàn phím)
                  </span>
                </div>
              )}`;

const newBlock = `{hasVotedThisQuestion && (
                <div className="p-3.5 rounded-[4px] fluent-box-nested text-xs text-[#FCEEEC] flex flex-col sm:flex-row sm:items-center justify-between mt-2 shadow-inner gap-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-2">
                      {isPendingSync ? <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-[#F7CAC9]" />} 
                      {isPendingSync ? 'Đang đồng bộ...' : 'Bạn đã chọn:'} <strong className="text-white font-mono text-sm">[{selectedChoice}]</strong>
                    </span>
                    {!isPendingSync && pollStats.total > 1 && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[#A78BFA] font-medium bg-purple-500/10 px-2 py-1 rounded-[4px] border border-purple-500/20 w-fit">
                        <Users className="w-3 h-3" />
                        Có {pollStats.percentages[selectedChoice] || 0}% ({Math.round(((pollStats.percentages[selectedChoice] || 0) * pollStats.total) / 100)} người) chọn giống bạn
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#B6A6D8] italic sm:text-right">
                    Có thể đổi đáp án (bấm 1-4 trên phím)
                  </span>
                </div>
              )}`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/AudienceView.tsx', content);
