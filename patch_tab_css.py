import re

file_path = "src/index.css"
with open(file_path, "r") as f:
    content = f.read()

old_tab = """.fluent-tablist .fui-Tab {
  font-family: 'Lexend', ui-sans-serif, system-ui, sans-serif !important;
  font-weight: 600 !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.025em !important;
  border-radius: 4px !important;
  padding: 0.5rem 0.875rem !important;
  min-height: 40px !important;
  color: rgba(255, 255, 255, 0.7) !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
  cursor: pointer !important;
  position: relative !important;
}"""

new_tab = """.fluent-tablist .fui-Tab {
  font-family: 'Lexend', ui-sans-serif, system-ui, sans-serif !important;
  font-weight: 600 !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.025em !important;
  border-radius: 4px !important;
  padding: 0.5rem 0.875rem !important;
  min-height: 40px !important;
  color: rgba(255, 255, 255, 0.7) !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  transition: color 0.25s ease, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1.15), background-color 0.25s ease, box-shadow 0.25s ease !important;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
  cursor: pointer !important;
  position: relative !important;
  transform-origin: center center !important;
}"""

content = content.replace(old_tab, new_tab)

old_tab_selected = """.fluent-tablist .fui-Tab[aria-selected="true"] {
  color: #ffffff !important;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.85), rgba(79, 70, 229, 0.85), rgba(147, 51, 234, 0.85)) !important;
  border-color: rgba(96, 165, 250, 0.6) !important;
  box-shadow: 0 4px 14px -1px rgba(59, 130, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
  font-weight: 700 !important;
}"""

new_tab_selected = """.fluent-tablist .fui-Tab[aria-selected="true"] {
  color: #ffffff !important;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.85), rgba(79, 70, 229, 0.85), rgba(147, 51, 234, 0.85)) !important;
  border-color: rgba(96, 165, 250, 0.6) !important;
  box-shadow: 0 4px 14px -1px rgba(59, 130, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
  font-weight: 700 !important;
  transform: scale(1.02) !important;
}"""

content = content.replace(old_tab_selected, new_tab_selected)


with open(file_path, "w") as f:
    f.write(content)
print("Tab CSS patched")
