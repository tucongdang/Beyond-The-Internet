import re

file_path = "src/components/EmergencyPollAudience.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add state
state_match = "  const [hasVoted, setHasVoted] = useState(false);" # wait, does it have hasVoted? Let's check state.
# Let's search for selectedChoice
state_match2 = "  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);"
if "const [submitToast, setSubmitToast]" not in content:
    content = content.replace(state_match2, state_match2 + "\n  const [submitToast, setSubmitToast] = useState<boolean>(false);")

# Update handleVote
handle_match = """    vibrateSubmit();
    soundFx.playClick();
    setSelectedChoice(choice);"""
new_handle = """    vibrateSubmit();
    soundFx.playClick();
    setSelectedChoice(choice);
    setSubmitToast(true);
    setTimeout(() => setSubmitToast(false), 2500);"""
if "setSubmitToast(true);" not in content:
    content = content.replace(handle_match, new_handle)

# Add UI
ui_match = """      <div className="max-w-3xl w-full mx-auto relative space-y-4">"""
toast_ui = """      <div className="max-w-3xl w-full mx-auto relative space-y-4">
        {submitToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-fadeInUp pointer-events-none">
            <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-[4px] shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">Đã gửi đáp án</span>
            </div>
          </div>
        )}"""
if "submitToast && (" not in content:
    content = content.replace(ui_match, toast_ui)

with open(file_path, "w") as f:
    f.write(content)

print("EmergencyPollAudience patched")
