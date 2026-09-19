import re
file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("responses[user.uid]?.choice.trim()", "(responses[user.uid]?.choice || '').trim()")

with open(file_path, "w") as f:
    f.write(content)
print("patched")
