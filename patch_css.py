import re

file_path = "src/index.css"
with open(file_path, "r") as f:
    content = f.read()

# Update option button transition
old_btn = """  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.fluent-option-btn:hover:not(:disabled) {"""

new_btn = """  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease;
  transform-origin: center center;
}

.fluent-option-btn:hover:not(:disabled) {"""

content = content.replace(old_btn, new_btn)

old_active = """.fluent-option-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
  filter: brightness(1.1);
}"""

new_active = """.fluent-option-btn:active:not(:disabled) {
  transform: scale(0.95);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  filter: brightness(1.2);
}"""
content = content.replace(old_active, new_active)

old_sel = """.fluent-option-btn.selected {
  background: rgba(247, 202, 201, 0.22);
  border-color: #F7CAC9;
  box-shadow: 0 0 20px rgba(247, 202, 201, 0.15), inset 0 0 10px rgba(247, 202, 201, 0.1);
  transform: translateY(-2px);
}"""

new_sel = """.fluent-option-btn.selected {
  background: rgba(247, 202, 201, 0.22);
  border-color: #F7CAC9;
  box-shadow: 0 0 20px rgba(247, 202, 201, 0.15), inset 0 0 10px rgba(247, 202, 201, 0.1);
  transform: scale(1.02);
}"""
content = content.replace(old_sel, new_sel)

with open(file_path, "w") as f:
    f.write(content)
print("CSS patched")
