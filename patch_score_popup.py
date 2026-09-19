import re

file_path = "src/components/ScoreDisplay.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    'className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 text-sm sm:text-lg font-black font-mono text-yellow-200 animate-float-fade pointer-events-none drop-shadow-lg z-50 whitespace-nowrap"',
    'className="absolute left-full ml-2 bottom-full text-base sm:text-xl font-black font-mono text-yellow-200 animate-float-fade pointer-events-none drop-shadow-lg z-50 whitespace-nowrap"'
)

with open(file_path, "w") as f:
    f.write(content)
print("Score popup style patched")
