import re

file_path = "src/components/FluentSearchBar.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("u.device_id", "u.user_info?.uid || ''")
content = content.replace("u.display_name", "u.user_info?.name || ''")
content = content.replace("u.selected_option", "u.choice || ''")
content = content.replace("u.score", "0")
content = content.replace("q.text", "q.question_text || ''")

with open(file_path, "w") as f:
    f.write(content)
print("Done fixing FluentSearchBar")
