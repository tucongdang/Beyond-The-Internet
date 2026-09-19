import re

file_path = "src/services/audienceScoringService.ts"
with open(file_path, "r") as f:
    content = f.read()

old_logic = """    const userResp = qResponses?.[userUid] || (userMssv ? Object.values(qResponses || {}).find(r => r.user_info?.mssv === userMssv) : undefined);
    if (!userResp) return;

    // Resolve question details"""

new_logic = """    const userResp = qResponses?.[userUid] || (userMssv ? Object.values(qResponses || {}).find(r => r.user_info?.mssv === userMssv) : undefined);
    if (!userResp) return;

    // PREVENT SCORING UNTIL REVEALED
    // If this is the current active question, and the admin hasn't revealed the result,
    // we should not compute points for it yet (to hide the result and total score from updating early).
    if (gameState?.question_id === qId && gameState?.status !== 'REVEAL') {
      return;
    }

    // Resolve question details"""

content = content.replace(old_logic, new_logic)

with open(file_path, "w") as f:
    f.write(content)
print("Scoring patched")
