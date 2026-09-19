import re

file_path = "src/components/EmergencyPollAudience.tsx"
with open(file_path, "r") as f:
    content = f.read()

bad_str = """  const [selectedChoice, setSelectedChoice] = useState<string>(
  const [submitToast, setSubmitToast] = useState<boolean>(false);
    userVote?.choice || ''
  );"""

good_str = """  const [selectedChoice, setSelectedChoice] = useState<string>(userVote?.choice || '');
  const [submitToast, setSubmitToast] = useState<boolean>(false);"""

content = content.replace(bad_str, good_str)

with open(file_path, "w") as f:
    f.write(content)
print("EmergencyPollAudience state fixed")
