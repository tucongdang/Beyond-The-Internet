import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

old_btn = """                          className={`relative w-full p-4 sm:p-5 rounded-[4px] text-left flex items-start gap-3.5 select-none overflow-hidden hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            isEliminated
                              ? 'opacity-30 fluent-box-nested line-through cursor-not-allowed border-white/5'
                              : isSelected
                              ? 'fluent-option-btn selected'
                              : 'fluent-option-btn'
                          }`}"""

new_btn = """                          className={`relative w-full p-4 sm:p-5 rounded-[4px] text-left flex items-start gap-3.5 select-none overflow-hidden hover-effect focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-all duration-300 ${
                            isEliminated
                              ? 'opacity-30 fluent-box-nested line-through cursor-not-allowed border-white/5'
                              : isSelected
                              ? 'fluent-option-btn selected shadow-[0_0_20px_rgba(247,202,201,0.2)] z-10 scale-[1.01]'
                              : hasVotedThisQuestion
                              ? 'fluent-option-btn opacity-40 hover:opacity-70 scale-[0.98]'
                              : 'fluent-option-btn'
                          }`}"""

content = content.replace(old_btn, new_btn)

with open(file_path, "w") as f:
    f.write(content)
print("Button fade patched")
