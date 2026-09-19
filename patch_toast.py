import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add state
state_match = "  const [hasVotedThisQuestion, setHasVotedThisQuestion] = useState<boolean>(false);"
if "const [submitToast, setSubmitToast]" not in content:
    content = content.replace(state_match, state_match + "\n  const [submitToast, setSubmitToast] = useState<boolean>(false);")

# Update handleOptionSelect
handle_match = """    setSelectedChoice(optionKey);
    setHasVotedThisQuestion(true);"""
new_handle = """    setSelectedChoice(optionKey);
    setHasVotedThisQuestion(true);
    setSubmitToast(true);
    setTimeout(() => setSubmitToast(false), 2500);"""
if "setSubmitToast(true);" not in content:
    content = content.replace(handle_match, new_handle)

# Add UI
ui_match = """        {seqToast && ("""
toast_ui = """        {/* Small Success Toast */}
        {submitToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-fadeInUp pointer-events-none">
            <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-[4px] shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">Đã gửi đáp án</span>
            </div>
          </div>
        )}
        
"""
if "submitToast && (" not in content:
    content = content.replace(ui_match, toast_ui + ui_match)

with open(file_path, "w") as f:
    f.write(content)

print("AudienceView patched")
