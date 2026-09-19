import re

file_path = "src/components/EmergencyPollAudience.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Let's search for selectedChoice
state_match = "  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);"
if "const [submitToast, setSubmitToast]" not in content:
    content = content.replace(state_match, state_match + "\n  const [submitToast, setSubmitToast] = useState<boolean>(false);")

with open(file_path, "w") as f:
    f.write(content)

print("EmergencyPollAudience patched again")
