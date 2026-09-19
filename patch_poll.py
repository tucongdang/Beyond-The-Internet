import re

file_path = "src/components/EmergencyPollAudience.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add import
import_str = "import { interpolateTimerColor } from '../utils/colorUtils';\n"
if "interpolateTimerColor" not in content:
    content = content.replace("import { vibrateSubmit, vibrateSuccess, vibrateTap } from '../utils/hapticUtils';", "import { vibrateSubmit, vibrateSuccess, vibrateTap } from '../utils/hapticUtils';\n" + import_str)

# Global Timer
old_global = """        <div className="w-full h-2 bg-[#3E1D74]/50 rounded-[4px] mb-4 overflow-hidden p-0.5 border border-[#F7CAC9]/30">
          <div
            className={`h-full rounded-[2px] ${
              timeLeft <= 5 ? 'bg-rose-500 shadow-sm shadow-rose-500/50' : 'bg-[#F7CAC9] shadow-sm shadow-[#F7CAC9]/40'
            }`}
            style={{ 
              width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%`,
              transition: 'width 1s linear, background-color 0.3s ease'
            }}
          />
        </div>"""

new_global = """        <div className="w-full h-2 bg-[#3E1D74]/50 rounded-[4px] mb-4 overflow-hidden p-0.5 border border-[#F7CAC9]/30">
          <div
            className="h-full rounded-[2px]"
            style={{ 
              width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%`,
              backgroundColor: interpolateTimerColor(Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)),
              boxShadow: `0 0 10px ${interpolateTimerColor(Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100))}80`,
              transition: 'width 1s linear, background-color 1s linear, box-shadow 1s linear'
            }}
          />
        </div>"""
content = content.replace(old_global, new_global)

# Subtle Progress Bar
old_subtle = """                {/* Subdued Progress Bar at the top of the button */}
                {poll.time_limit > 0 && poll.status === 'ACTIVE' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                    <div 
                      className={`h-full ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}
                      style={{ width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%`, transition: 'width 1s linear, background-color 0.3s ease' }}
                    />
                  </div>
                )}"""

new_subtle = """                {/* Subdued Progress Bar at the top of the button */}
                {poll.time_limit > 0 && poll.status === 'ACTIVE' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                    <div 
                      className="h-full"
                      style={{ 
                        width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%`, 
                        backgroundColor: interpolateTimerColor(Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)),
                        transition: 'width 1s linear, background-color 1s linear' 
                      }}
                    />
                  </div>
                )}"""
content = content.replace(old_subtle, new_subtle)

with open(file_path, "w") as f:
    f.write(content)
print("Poll patched")
