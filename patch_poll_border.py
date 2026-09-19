import re

file_path = "src/components/EmergencyPollAudience.tsx"
with open(file_path, "r") as f:
    content = f.read()

old_map = """          {stats.map((item) => {
            const isSelected = selectedChoice === item.key;
            const hasSelected = Boolean(selectedChoice);
            const isCorrect = poll.correct_option === item.key;
            const pct = (timeLeft <= 0 || !isVotingActive) ? (pollStats.percentages[item.key] || 0) : null;"""

new_map = """          {stats.map((item) => {
            const isSelected = selectedChoice === item.key;
            const hasSelected = Boolean(selectedChoice);
            const serverCorrectKey = poll.correct_option;
            const isCorrectAnswer = serverCorrectKey && item.key === serverCorrectKey;
            const isUserIncorrect = hasSelected && isSelected && serverCorrectKey && item.key !== serverCorrectKey;
            const pct = (timeLeft <= 0 || !isVotingActive) ? (pollStats.percentages[item.key] || 0) : null;"""
content = content.replace(old_map, new_map)

old_class = """                className={`p-4 sm:p-5 rounded-[4px] border text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between group active:scale-95 disabled:cursor-not-allowed cursor-pointer ${
                  isSelected
                    ? 'fluent-option-btn selected animate-pulse scale-[1.02] z-10'
                    : !isVotingActive
                    ? 'fluent-box-nested opacity-60'
                    : hasSelected
                    ? 'fluent-option-btn opacity-40 hover:opacity-70 scale-95'
                    : 'fluent-option-btn'
                }`}"""

new_class = """                className={`p-4 sm:p-5 rounded-[4px] border text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between group active:scale-95 disabled:cursor-not-allowed cursor-pointer ${
                  isCorrectAnswer && hasSelected
                    ? 'fluent-option-btn !border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] !bg-emerald-500/20 z-10 scale-[1.02] animate-pulse'
                  : isUserIncorrect
                    ? 'fluent-option-btn !border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] !bg-rose-500/20 z-10 scale-[1.02]'
                  : isSelected
                    ? 'fluent-option-btn selected animate-pulse scale-[1.02] z-10'
                  : !isVotingActive
                    ? 'fluent-box-nested opacity-60'
                  : hasSelected
                    ? 'fluent-option-btn opacity-40 hover:opacity-70 scale-95'
                  : 'fluent-option-btn'
                }`}"""
content = content.replace(old_class, new_class)

with open(file_path, "w") as f:
    f.write(content)
print("Patched EmergencyPollAudience")
