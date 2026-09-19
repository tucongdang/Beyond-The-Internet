import re

files = [
    "src/components/AudienceView.tsx",
    "src/components/EmergencyPollAudience.tsx"
]

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # AudienceView target
    content = content.replace(
        "className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-amber-400/60'}`}",
        "className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}"
    )

    with open(file_path, "w") as f:
        f.write(content)

print("Done")
