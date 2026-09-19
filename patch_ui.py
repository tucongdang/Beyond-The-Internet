import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Let's extract the question body from ACTIVE state and put it in a variable.
# Actually, since I just want to fix REVEAL quickly without risking breaking ACTIVE/LOCKED,
# I will just inject a simplified version of the question text and options into REVEAL state.

inject_code = """
        {/* ORIGINAL QUESTION & OPTIONS (Injected to fix "che rùi" issue) */}
        <div className="fluent-box rounded-[4px] p-5 sm:p-6 shadow-xl mb-6">
          <h3 className="text-lg sm:text-xl font-black text-white leading-relaxed mb-4">
            {gameState.question_text}
          </h3>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3`}>
            {Object.entries(gameState.options || {}).map(([key, label]) => {
              const serverCorrectKey = (gameState.correct_key || '').trim().toUpperCase();
              const isSelected = (selectedChoice || "").toUpperCase() === key.toUpperCase();
              const isCorrectAnswer = serverCorrectKey && key.toUpperCase() === serverCorrectKey;
              const isUserIncorrect = hasAnswered && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;
              
              return (
                <div
                  key={key}
                  className={`relative w-full p-4 sm:p-5 rounded-[4px] text-left flex items-start gap-3.5 select-none overflow-hidden transition-all duration-300 ${
                    isCorrectAnswer
                      ? 'fluent-option-btn border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] bg-emerald-500/20 z-10 scale-[1.01] animate-pulse'
                      : isUserIncorrect
                      ? 'fluent-option-btn border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] bg-rose-500/20 z-10 scale-[1.01]'
                      : isSelected
                      ? 'fluent-option-btn selected shadow-[0_0_20px_rgba(247,202,201,0.2)] z-10 scale-[1.01]'
                      : 'fluent-option-btn opacity-40 hover:opacity-70 scale-[0.98]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0 font-black font-mono text-base sm:text-lg border ${
                    isCorrectAnswer ? 'bg-emerald-500 text-white border-emerald-400' :
                    isUserIncorrect ? 'bg-rose-500 text-white border-rose-400' :
                    isSelected ? 'bg-white text-[#0D0420] border-white' : 
                    'bg-[#F7CAC9]/10 text-[#F7CAC9] border-[#F7CAC9]/30'
                  }`}>
                    {key}
                  </div>
                  <span className={`text-sm sm:text-base font-medium leading-snug flex-1 ${isSelected || isCorrectAnswer ? 'text-white' : 'text-slate-300'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
"""

# Find where to inject it in REVEAL state.
# Let's put it right after the Hero Card: `<div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-3"> ... </div> </div>`
hero_card_end = """          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-3">
            <span className="text-xs text-slate-300">Bạn thấy câu hỏi này thế nào?</span>
            <QuestionLikeButton
              questionId={gameState.question_id}
              user={user}
              gameState={gameState}
              variant="pill"
            />
          </div>
        </div>"""

content = content.replace(hero_card_end, hero_card_end + inject_code)

with open(file_path, "w") as f:
    f.write(content)
print("UI patched")
