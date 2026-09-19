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
        "className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}\n                                style={{ width: `${timerProgress}%` }}",
        "className={`h-full ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}\n                                style={{ width: `${timerProgress}%`, transition: 'width 1s linear, background-color 0.3s ease' }}"
    )

    # EmergencyPollAudience target
    content = content.replace(
        "className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}\n                      style={{ width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%` }}",
        "className={`h-full ${timeLeft <= 5 ? 'bg-rose-500/80' : 'bg-[#F7CAC9]/80'}`}\n                      style={{ width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%`, transition: 'width 1s linear, background-color 0.3s ease' }}"
    )


    with open(file_path, "w") as f:
        f.write(content)

print("Done")
