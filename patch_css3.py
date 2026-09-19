import re

file_path = "src/index.css"
with open(file_path, "r") as f:
    content = f.read()

# I see .fluent-option-btn.selected
old_sel = """.fluent-option-btn.selected {
  background: rgba(168, 85, 247, 0.25) !important;
  border: 1px solid rgba(247, 202, 201, 0.6) !important;
  box-shadow: 0 0 24px rgba(247, 202, 201, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}"""

new_sel = """.fluent-option-btn.selected {
  background: rgba(168, 85, 247, 0.25) !important;
  border: 1px solid rgba(247, 202, 201, 0.6) !important;
  box-shadow: 0 0 24px rgba(247, 202, 201, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  transform: scale(1.02);
}"""

content = content.replace(old_sel, new_sel)

with open(file_path, "w") as f:
    f.write(content)

print("CSS patched 3")
