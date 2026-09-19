import re
file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("const val = r.choice?.trim().toUpperCase();", "const val = (r.choice || '').trim().toUpperCase();")

with open(file_path, "w") as f:
    f.write(content)
print("patched")
