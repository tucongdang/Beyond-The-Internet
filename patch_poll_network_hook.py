import re

file_path = "src/components/EmergencyPollAudience.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("const [timeLeft, setTimeLeft] = useState<number>(poll?.time_limit || 0);", "const [timeLeft, setTimeLeft] = useState<number>(poll?.time_limit || 0);\n  const networkStatus = useNetworkStatus();")

with open(file_path, "w") as f:
    f.write(content)
print("Poll hook patched")
