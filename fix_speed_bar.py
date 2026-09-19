import re

files = [
    "src/components/ProjectorView.tsx",
    "src/components/ProjectorView_no_responsive.tsx"
]

target_code_old = """            {/* Tăng Tốc Energy Speed Track Bar */}
            {isTTRound && gameState.status === 'ACTIVE' && (
              <div className="w-full h-2.5 fluent-box-nested rounded-[4px] overflow-hidden p-0.5 border border-amber-500/30 shadow-inner">
                <div
                  className={`h-full rounded-[4px] transition-all duration-200 ${
                    timeLeft <= 3
                      ? 'bg-rose-500 shadow-lg shadow-rose-500'
                      : timeLeft <= 5
                      ? 'bg-amber-400 shadow-md shadow-amber-400'
                      : 'fluent-acrylic-surface'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (timeLeft / totalTimeLimit) * 100))}%` }}
                />
              </div>
            )}"""

target_code_new = """            {/* Tăng Tốc Energy Speed Track Bar */}
            {isTTRound && gameState.status === 'ACTIVE' && (
              <div className="w-full h-2.5 fluent-box-nested rounded-[4px] overflow-hidden p-0.5 border border-[#F7CAC9]/30 shadow-inner">
                <div
                  className={`h-full rounded-[2px] ${
                    timeLeft <= 3
                      ? 'bg-rose-600 shadow-lg shadow-rose-600/50'
                      : timeLeft <= 5
                      ? 'bg-rose-400 shadow-md shadow-rose-400/50'
                      : 'bg-[#F7CAC9] shadow-md shadow-[#F7CAC9]/40'
                  }`}
                  style={{ 
                    width: `${Math.max(0, Math.min(100, (timeLeft / totalTimeLimit) * 100))}%`,
                    transition: 'width 1s linear, background-color 0.3s ease'
                  }}
                />
              </div>
            )}"""

for file_path in files:
    try:
        with open(file_path, "r") as f:
            content = f.read()

        if target_code_old in content:
            content = content.replace(target_code_old, target_code_new)
            with open(file_path, "w") as f:
                f.write(content)
            print(f"Updated {file_path}")
        else:
            print(f"Target not found in {file_path}")
    except FileNotFoundError:
        print(f"File not found: {file_path}")

print("Done")
