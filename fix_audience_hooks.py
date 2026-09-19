import re

file_path = "src/components/AudienceView.tsx"
with open(file_path, "r") as f:
    content = f.read()

old_hook = """    const timerProgress = Math.max(0, (timeLeft / (gameState.time_limit || 1)) * 100);

    const pollStats = useMemo(() => {
      if (!allResponses || !gameState.question_id) return { total: 0, percentages: {} };
      const responsesForQ = allResponses[gameState.question_id] || {};
      const total = Object.keys(responsesForQ).length;
      const counts: Record<string, number> = {};
      Object.values(responsesForQ).forEach(r => {
        const val = (r.choice || '').trim().toUpperCase();
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      const percentages: Record<string, number> = {};
      Object.keys(gameState.options || {}).forEach(k => {
        percentages[k] = total > 0 ? Math.round(((counts[k.toUpperCase()] || 0) / total) * 100) : 0;
      });
      return { total, percentages };
    }, [allResponses, gameState.question_id, gameState.options]);"""

new_hook = """    const timerProgress = Math.max(0, (timeLeft / (gameState.time_limit || 1)) * 100);"""

if old_hook in content:
    print("Found old hook")

# We should move the `pollStats` memo out of the if block entirely.
# Let's place it around line 590, near `userPerformance`.

content = content.replace(old_hook, new_hook)

new_hook_code = """
  // Compute live user stats and score breakdown across all rounds
  const userPerformance = useMemo(() => {
"""

poll_stats_code = """
  const pollStats = useMemo(() => {
    if (!allResponses || !gameState.question_id) return { total: 0, percentages: {} };
    const responsesForQ = allResponses[gameState.question_id] || {};
    const total = Object.keys(responsesForQ).length;
    const counts: Record<string, number> = {};
    Object.values(responsesForQ).forEach(r => {
      const val = (r.choice || '').trim().toUpperCase();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    const percentages: Record<string, number> = {};
    Object.keys(gameState.options || {}).forEach(k => {
      percentages[k] = total > 0 ? Math.round(((counts[k.toUpperCase()] || 0) / total) * 100) : 0;
    });
    return { total, percentages };
  }, [allResponses, gameState.question_id, gameState.options]);

  // Compute live user stats and score breakdown across all rounds
  const userPerformance = useMemo(() => {
"""

content = content.replace(new_hook_code, poll_stats_code)

with open(file_path, "w") as f:
    f.write(content)
print("Audience hooks fixed")
