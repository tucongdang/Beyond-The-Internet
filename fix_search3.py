import re

file_path = "src/components/FluentSearchBar.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("Object.values(allResponses)", "(Object.values(allResponses || {}).flatMap((q: any) => Object.values(q || {})) as any[])")

content = content.replace("u.device_id", "u.user_info?.uid || ''")
content = content.replace("u.display_name", "u.user_info?.name || ''")

with open(file_path, "w") as f:
    f.write(content)
print("Done")
