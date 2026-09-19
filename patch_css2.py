import re

file_path = "src/index.css"
with open(file_path, "r") as f:
    content = f.read()

# I see .fluent-option-btn starts with `.fluent-option-btn {`
old_btn = """.fluent-option-btn {
  background: rgba(25, 8, 57, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.fluent-option-btn:hover:not(:disabled) {
  background: rgba(45, 18, 90, 0.75);
  border-color: rgba(247, 202, 201, 0.45);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.fluent-option-btn:active:not(:disabled) {
  transform: translateY(1.5px) scale(0.97);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(0, 0, 0, 0.3);
}"""

new_btn = """.fluent-option-btn {
  background: rgba(25, 8, 57, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1.15), background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  transform-origin: center center;
  position: relative;
  overflow: hidden;
}

.fluent-option-btn:hover:not(:disabled) {
  background: rgba(45, 18, 90, 0.75);
  border-color: rgba(247, 202, 201, 0.45);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transform: scale(1.02);
}

.fluent-option-btn:active:not(:disabled) {
  transform: scale(0.96);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(0, 0, 0, 0.3);
}"""

content = content.replace(old_btn, new_btn)

with open(file_path, "w") as f:
    f.write(content)

print("CSS patched 2")
