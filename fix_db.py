import re

with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

content = content.replace("db={db}", "db={null}")

with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)

print("Fixed db reference")
