import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add import
if "useNetworkStatus" not in content:
    content = content.replace("import { useScreenWakeLock } from '../hooks/useScreenWakeLock';", "import { useScreenWakeLock } from '../hooks/useScreenWakeLock';\nimport { useNetworkStatus } from '../hooks/useNetworkStatus';")

# Add hook to AudienceViewContent
if "const networkStatus = useNetworkStatus();" not in content:
    content = content.replace("const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));", "const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));\n  const networkStatus = useNetworkStatus();")

# Inject LED into fluent-option-btn
# Find this structure:
#                         <button
#                           key={key}
#                           type="button"
#                           onClick={(e) => {
# ...
#                           className={`relative overflow-hidden w-full text-left p-4 sm:p-5 rounded-[4px] border-l-[3px] transition-all hover-effect min-h-[72px] sm:min-h-[80px] flex items-center justify-between gap-4 group cursor-pointer ${
#                             isEliminated 
#                               ? 'opacity-20 pointer-events-none grayscale' 
#                               : isSelected
#                               ? 'fluent-option-btn selected'
#                               : 'fluent-option-btn'
#                           }`}
#                         >

old_btn = """                          }`}
                        >
                          {/* Subtle Progress Bar at the top of the button */}"""

new_btn = """                          }`}
                        >
                          {/* Network LED */}
                          <div 
                            className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full z-20 shadow-[0_0_8px_currentColor] ${
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

                          {/* Subtle Progress Bar at the top of the button */}"""

content = content.replace(old_btn, new_btn)

with open(file_path, "w") as f:
    f.write(content)
print("Audience patched")
