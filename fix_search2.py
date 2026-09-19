import re

file_path = "src/components/FluentSearchBar.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("allResponses: Record<string, UserResponse>;", "allResponses: any;")
content = content.replace("u.device_id", "u.uid")
content = content.replace("u.display_name", "u.name")

with open(file_path, "w") as f:
    f.write(content)
print("Done")
