import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "const isUserIncorrect = hasVotedThisQuestion && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;\n                      const isSelected = (selectedChoice || '').toUpperCase() === key.toUpperCase();",
    "const isSelected = (selectedChoice || '').toUpperCase() === key.toUpperCase();\n                      const isUserIncorrect = hasVotedThisQuestion && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;"
)

with open(file_path, "w") as f:
    f.write(content)
print("TS errors patched again")
