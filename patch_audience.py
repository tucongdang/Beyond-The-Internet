import re
file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("selectedChoice.toUpperCase()", "(selectedChoice || '').toUpperCase()")

with open(file_path, "w") as f:
    f.write(content)
print("patched")
