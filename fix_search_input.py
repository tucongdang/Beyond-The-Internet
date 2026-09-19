with open("src/components/FluentSearchBar.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'className="fluent-input w-full bg-black/20 border border-white/10 text-white text-sm rounded-[4px] pl-9 pr-8 py-1.5 focus:border-sky-500/50 focus:bg-white/5 transition-all outline-none placeholder:text-white/30"',
    'className="fluent-input w-full text-white text-sm rounded-[4px] pl-9 pr-8 py-1.5 transition-all outline-none placeholder:text-white/30"'
)

with open("src/components/FluentSearchBar.tsx", "w") as f:
    f.write(content)

print("Fixed FluentSearchBar input class names")
