import re

file_path = "src/components/AudienceView.tsx"

target_code_old = """        {/* Timer progress bar */}
        <div className="w-full h-2 bg-[#3E1D74]/50 rounded-[4px] mb-5 overflow-hidden p-0.5 border border-white/10">
          <div
            className={`h-full rounded-[2px] transition-all duration-300 ${
              timeLeft <= 3
                ? 'bg-rose-500 shadow-sm shadow-rose-500'
                : timeLeft <= 5
                ? 'bg-amber-400 shadow-sm shadow-amber-400'
                : isTTRound
                ? 'fluent-acrylic-surface'
                : 'bg-gradient-horizon'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>"""

target_code_new = """        {/* Timer progress bar */}
        <div className="w-full h-2 bg-[#3E1D74]/50 rounded-[4px] mb-5 overflow-hidden p-0.5 border border-[#F7CAC9]/30">
          <div
            className={`h-full rounded-[2px] ${
              timeLeft <= 3
                ? 'bg-rose-600 shadow-sm shadow-rose-600/50'
                : timeLeft <= 5
                ? 'bg-rose-400 shadow-sm shadow-rose-400/50'
                : 'bg-[#F7CAC9] shadow-sm shadow-[#F7CAC9]/40'
            }`}
            style={{ 
              width: `${timerProgress}%`,
              transition: 'width 1s linear, background-color 0.3s ease'
            }}
          />
        </div>"""

with open(file_path, "r") as f:
    content = f.read()

if target_code_old in content:
    content = content.replace(target_code_old, target_code_new)
    with open(file_path, "w") as f:
        f.write(content)
    print("Updated")
else:
    print("Not found")

