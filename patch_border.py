import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add serverCorrectKey extraction
old_map = "                    {Object.entries(gameState.options || {}).map(([key, label], idx) => {"
new_map = """                    {Object.entries(gameState.options || {}).map(([key, label], idx) => {
                      const serverCorrectKey = (gameState.correct_key || '').trim().toUpperCase();
                      const isCorrectAnswer = serverCorrectKey && key.toUpperCase() === serverCorrectKey;
                      const isUserIncorrect = hasVotedThisQuestion && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;
"""
content = content.replace(old_map, new_map)

old_class = """                          className={`relative w-full p-4 sm:p-5 rounded-[4px] text-left flex items-start gap-3.5 select-none overflow-hidden hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-all duration-300 ${
                            isEliminated
                              ? 'opacity-30 fluent-box-nested line-through cursor-not-allowed border-white/5'
                              : isSelected
                              ? 'fluent-option-btn selected shadow-[0_0_20px_rgba(247,202,201,0.2)] z-10 scale-[1.01]'
                              : hasVotedThisQuestion
                              ? 'fluent-option-btn opacity-40 hover:opacity-70 scale-[0.98]'
                              : 'fluent-option-btn'
                          }`}"""

new_class = """                          className={`relative w-full p-4 sm:p-5 rounded-[4px] text-left flex items-start gap-3.5 select-none overflow-hidden hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-all duration-300 ${
                            isEliminated
                              ? 'opacity-30 fluent-box-nested line-through cursor-not-allowed border-white/5'
                              : isCorrectAnswer && hasVotedThisQuestion
                              ? 'fluent-option-btn border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] bg-emerald-500/20 z-10 scale-[1.01] animate-pulse'
                              : isUserIncorrect
                              ? 'fluent-option-btn border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] bg-rose-500/20 z-10 scale-[1.01]'
                              : isSelected
                              ? 'fluent-option-btn selected shadow-[0_0_20px_rgba(247,202,201,0.2)] z-10 scale-[1.01]'
                              : hasVotedThisQuestion
                              ? 'fluent-option-btn opacity-40 hover:opacity-70 scale-[0.98]'
                              : 'fluent-option-btn'
                          }`}"""
content = content.replace(old_class, new_class)

with open(file_path, "w") as f:
    f.write(content)
print("Patched AudienceView")
