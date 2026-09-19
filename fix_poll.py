import re

file_path = "src/components/EmergencyPollAudience.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("poll.options.forEach(opt => {", "Object.keys(poll.options || {}).forEach(key => {")
content = content.replace("percentages[opt.key] = total > 0 ? Math.round(((counts[opt.key] || 0) / total) * 100) : 0;", "percentages[key] = total > 0 ? Math.round(((counts[key] || 0) / total) * 100) : 0;")

with open(file_path, "w") as f:
    f.write(content)
print("Done")
