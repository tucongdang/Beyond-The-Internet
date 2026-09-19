with open("src/components/FluentSearchBar.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-white/10 shadow-2xl shadow-black/50 rounded-[4px] overflow-hidden z-50 animate-fadeIn"',
    'className="absolute top-full left-0 right-0 mt-2 fluent-box shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fadeIn"'
)

with open("src/components/FluentSearchBar.tsx", "w") as f:
    f.write(content)

print("Fixed dropdown class")
