const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

const badModalRegex = /\{\/\* Auto-Zoom Long Text Question Modal \*\/\}[\s\S]*?Đóng\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/m;
content = content.replace(badModalRegex, "");

const modalContent = `
      {/* Auto-Zoom Long Text Question Modal */}
      {isQuestionZoomed && isLongQuestion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-200" onClick={() => setIsQuestionZoomed(false)}>
          <div className="w-full max-w-2xl bg-[#0f172a] border border-[#F7CAC9]/30 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="text-[#F7CAC9] font-mono font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
                Đọc Dễ Hơn
              </h3>
              <button
                onClick={() => setIsQuestionZoomed(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-relaxed tracking-tight">
                {gameState.question_text}
              </h2>
            </div>
            <div className="p-4 border-t border-white/10 bg-white/5 text-center">
              <button
                onClick={() => setIsQuestionZoomed(false)}
                className="px-6 py-2.5 rounded-[4px] bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace("<ShareGameModal", `${modalContent}\n        <ShareGameModal`);

fs.writeFileSync('src/components/AudienceView.tsx', content);
