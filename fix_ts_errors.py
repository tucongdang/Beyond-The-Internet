import re

# Fix AudienceView.tsx
file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

old_map = """                    {Object.entries(gameState.options || {}).map(([key, label], idx) => {
                      const serverCorrectKey = (gameState.correct_key || '').trim().toUpperCase();
                      const isCorrectAnswer = serverCorrectKey && key.toUpperCase() === serverCorrectKey;
                      const isUserIncorrect = hasVotedThisQuestion && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;
                      const isSelected = (selectedChoice || '').toUpperCase() === key.toUpperCase();"""

new_map = """                    {Object.entries(gameState.options || {}).map(([key, label], idx) => {
                      const serverCorrectKey = (gameState.correct_key || '').trim().toUpperCase();
                      const isSelected = (selectedChoice || '').toUpperCase() === key.toUpperCase();
                      const isCorrectAnswer = serverCorrectKey && key.toUpperCase() === serverCorrectKey;
                      const isUserIncorrect = hasVotedThisQuestion && isSelected && serverCorrectKey && key.toUpperCase() !== serverCorrectKey;"""
content = content.replace(old_map, new_map)

with open(file_path, "w") as f:
    f.write(content)


# Fix EmergencyPollAudience.tsx
file_path2 = "src/components/EmergencyPollAudience.tsx"
with open(file_path2, "r") as f:
    content2 = f.read()

# I deleted `const isCorrect = poll.correct_option === item.key;` earlier.
# Let's see if it's used elsewhere.
content2 = content2.replace("const serverCorrectKey = poll.correct_option;", "const serverCorrectKey = poll.correct_option;\n            const isCorrect = poll.correct_option === item.key;")

with open(file_path2, "w") as f:
    f.write(content2)

print("TS errors patched")
