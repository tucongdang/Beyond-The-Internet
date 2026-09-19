import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add import
import_str = "import { interpolateTimerColor } from '../utils/colorUtils';\n"
if "interpolateTimerColor" not in content:
    content = content.replace("import { getUserDisplayUid } from '../utils/uidUtils';", "import { getUserDisplayUid } from '../utils/uidUtils';\n" + import_str)

# Replace Global Timer
old_global = """        {/* Timer progress bar */}
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

new_global = """        {/* Timer progress bar */}
        <div className="w-full h-2 bg-[#3E1D74]/50 rounded-[4px] mb-5 overflow-hidden p-0.5 border border-[#F7CAC9]/30">
          <div
            className="h-full rounded-[2px]"
            style={{ 
              width: `${timerProgress}%`,
              backgroundColor: interpolateTimerColor(timerProgress),
              boxShadow: `0 0 10px ${interpolateTimerColor(timerProgress)}80`,
              transition: 'width 1s linear, background-color 1s linear, box-shadow 1s linear'
            }}
          />
        </div>"""
content = content.replace(old_global, new_global)

# Replace Subtle Progress Bar
old_subtle = """                          {/* Subtle Progress Bar at the top of the button */}
                          {gameState.status === 'ACTIVE' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                              <div 
                                className={`h-full ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}
                                style={{ width: `${timerProgress}%`, transition: 'width 1s linear, background-color 0.3s ease' }}
                              />
                            </div>
                          )}"""

new_subtle = """                          {/* Subtle Progress Bar at the top of the button */}
                          {gameState.status === 'ACTIVE' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                              <div 
                                className="h-full"
                                style={{ 
                                  width: `${timerProgress}%`, 
                                  backgroundColor: interpolateTimerColor(timerProgress),
                                  transition: 'width 1s linear, background-color 1s linear' 
                                }}
                              />
                            </div>
                          )}"""
content = content.replace(old_subtle, new_subtle)

with open(file_path, "w") as f:
    f.write(content)
print("Audience patched")
