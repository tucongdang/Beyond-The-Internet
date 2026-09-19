import re

file_path = "src/components/ProjectorView.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add import
import_str = "import { interpolateTimerColor } from '../utils/colorUtils';\n"
if "interpolateTimerColor" not in content:
    content = content.replace("import { Play, Flame, BarChart3, Users, Crown, Zap, Clock, ShieldAlert, MonitorPlay, ChevronRight, Pause, Info, MessageSquare } from 'lucide-react';", "import { Play, Flame, BarChart3, Users, Crown, Zap, Clock, ShieldAlert, MonitorPlay, ChevronRight, Pause, Info, MessageSquare } from 'lucide-react';\n" + import_str)

# Timer bar
old_timer = """                <div
                  className={`h-full rounded-[3px] ${
                    timeLeft <= 3
                      ? 'bg-rose-600 shadow-md shadow-rose-600/50'
                      : timeLeft <= 5
                      ? 'bg-rose-400 shadow-md shadow-rose-400/50'
                      : 'bg-[#F7CAC9] shadow-md shadow-[#F7CAC9]/40'
                  }`}
                  style={{ 
                    width: `${Math.max(0, Math.min(100, (timeLeft / totalTimeLimit) * 100))}%`,
                    transition: 'width 1s linear, background-color 0.3s ease'
                  }}
                />"""

new_timer = """                <div
                  className="h-full rounded-[3px]"
                  style={{ 
                    width: `${Math.max(0, Math.min(100, (timeLeft / totalTimeLimit) * 100))}%`,
                    backgroundColor: interpolateTimerColor(Math.max(0, Math.min(100, (timeLeft / totalTimeLimit) * 100))),
                    boxShadow: `0 0 10px ${interpolateTimerColor(Math.max(0, Math.min(100, (timeLeft / totalTimeLimit) * 100)))}80`,
                    transition: 'width 1s linear, background-color 1s linear, box-shadow 1s linear'
                  }}
                />"""
content = content.replace(old_timer, new_timer)

with open(file_path, "w") as f:
    f.write(content)
print("Projector patched")
