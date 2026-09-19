import re

# 1. Fix AdminPortal.tsx
file_path_admin = "src/components/AdminPortal.tsx"
with open(file_path_admin, "r") as f:
    content_admin = f.read()

content_admin = content_admin.replace(
    """<AudienceView
          gameState={gameState}
          user={null}
          responses={allResponses}
          onOpenRegister={() => {}}
          onOpenProfile={() => {}}
        />""",
    """<AudienceView
          gameState={gameState}
          user={null}
          responses={allResponses[gameState.question_id] || {}}
          allResponses={allResponses}
          onOpenRegister={() => {}}
          onOpenProfile={() => {}}
        />"""
)

with open(file_path_admin, "w") as f:
    f.write(content_admin)

# 2. Fix EmergencyPollAudience.tsx
file_path_poll = "src/components/EmergencyPollAudience.tsx"
with open(file_path_poll, "r") as f:
    content_poll = f.read()

if "const pollStats =" not in content_poll:
    insert_str = """
  const pollStats = React.useMemo(() => {
    if (!pollResponses || !poll?.options) return { total: 0, percentages: {} };
    const total = Object.keys(pollResponses).length;
    const counts: Record<string, number> = {};
    Object.values(pollResponses).forEach(r => {
      const val = r.choice?.trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    const percentages: Record<string, number> = {};
    poll.options.forEach(opt => {
      percentages[opt.key] = total > 0 ? Math.round(((counts[opt.key] || 0) / total) * 100) : 0;
    });
    return { total, percentages };
  }, [pollResponses, poll?.options]);
"""
    content_poll = content_poll.replace("const [timeLeft, setTimeLeft] = useState<number>(poll?.time_limit || 0);", "const [timeLeft, setTimeLeft] = useState<number>(poll?.time_limit || 0);" + insert_str)
    
    with open(file_path_poll, "w") as f:
        f.write(content_poll)
print("Done fixing AdminPortal and EmergencyPollAudience")
