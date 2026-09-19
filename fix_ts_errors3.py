import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Let's find `const isSelected` and move it above `const isUserIncorrect`
lines = content.split('\n')
for i, line in enumerate(lines):
    if "const isUserIncorrect =" in line:
        # Check if the next line is `const isSelected`
        if "const isSelected =" in lines[i+1]:
            # swap
            lines[i], lines[i+1] = lines[i+1], lines[i]

with open(file_path, "w") as f:
    f.write('\n'.join(lines))
print("TS errors patched robustly")
