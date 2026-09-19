with open("src/components/AdminDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'const cardClasses = "fluent-box p-4 sm:p-5 rounded-[4px] border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer group";',
    'const cardClasses = "fluent-box p-4 sm:p-5 transition-all cursor-pointer group hover:bg-white/5";'
)

with open("src/components/AdminDashboard.tsx", "w") as f:
    f.write(content)

print("Fixed card classes")
