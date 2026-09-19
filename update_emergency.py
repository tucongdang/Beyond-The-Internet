import re

with open("src/components/EmergencyPollAudience.tsx", "r") as f:
    content = f.read()

target = """                {/* Glowing Aura Overlay when selected */}
                {isSelected && ("""

timer_bar = """                {/* Subdued Progress Bar at the top of the button */}
                {poll.time_limit > 0 && poll.status === 'ACTIVE' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                    <div 
                      className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-amber-400/60'}`}
                      style={{ width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%` }}
                    />
                  </div>
                )}

"""

if target in content:
    content = content.replace(target, timer_bar + target)
    with open("src/components/EmergencyPollAudience.tsx", "w") as f:
        f.write(content)
    print("Updated EmergencyPollAudience.tsx")
else:
    print("Target not found")
