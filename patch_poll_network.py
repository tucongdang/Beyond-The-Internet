import re

file_path = "src/components/EmergencyPollAudience.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add import
if "useNetworkStatus" not in content:
    content = content.replace("import { interpolateTimerColor } from '../utils/colorUtils';", "import { interpolateTimerColor } from '../utils/colorUtils';\nimport { useNetworkStatus } from '../hooks/useNetworkStatus';")

# Add hook
if "const networkStatus = useNetworkStatus();" not in content:
    content = content.replace("  const hasVotedThisQuestion = Boolean(selectedChoice);", "  const hasVotedThisQuestion = Boolean(selectedChoice);\n  const networkStatus = useNetworkStatus();")

old_btn = """                style={{
                  backgroundColor: isSelected ? `${item.color}35` : undefined,
                  borderColor: isSelected ? item.color : undefined,
                  boxShadow: isSelected ? `0 0 25px ${item.color}80, inset 0 0 15px ${item.color}40` : undefined,
                }}
              >
"""

new_btn = """                style={{
                  backgroundColor: isSelected ? `${item.color}35` : undefined,
                  borderColor: isSelected ? item.color : undefined,
                  boxShadow: isSelected ? `0 0 25px ${item.color}80, inset 0 0 15px ${item.color}40` : undefined,
                }}
              >
                {/* Network LED */}
                <div 
                  className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full z-30 shadow-[0_0_8px_currentColor] ${
                    networkStatus === 'OFFLINE' ? 'bg-rose-500 text-rose-500 animate-pulse' :
                    networkStatus === 'DELAYED' ? 'bg-amber-400 text-amber-400' :
                    'bg-emerald-500 text-emerald-500'
                  }`}
                  title={
                    networkStatus === 'OFFLINE' ? 'Mất kết nối' :
                    networkStatus === 'DELAYED' ? 'Mạng chậm/trễ' :
                    'Mạng ổn định'
                  }
                />
"""

content = content.replace(old_btn, new_btn)

with open(file_path, "w") as f:
    f.write(content)
print("Poll patched")
