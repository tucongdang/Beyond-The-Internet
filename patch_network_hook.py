import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("const [selectedChoice, setSelectedChoice] = useState<string>('');", "const [selectedChoice, setSelectedChoice] = useState<string>('');\n  const networkStatus = useNetworkStatus();")

with open(file_path, "w") as f:
    f.write(content)
print("Audience hook patched")
