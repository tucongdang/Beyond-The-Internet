import re

file_path = "src/components/FluentSearchBar.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("(q.question_text || '' && q.question_text || ''.toLowerCase().includes(lowerQuery))", "(q.question_text && q.question_text.toLowerCase().includes(lowerQuery))")
content = content.replace("q.question_text || ''?.substring(0, 50)", "(q.question_text || '').substring(0, 50)")
content = content.replace("(q.question_text || '' && q.question_text || ''.length > 50 ? '...' : '')", "(q.question_text && q.question_text.length > 50 ? '...' : '')")

with open(file_path, "w") as f:
    f.write(content)
print("Done")
