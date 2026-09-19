const fs = require('fs');
const content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

const badBlock = `  }, [seqToast]);

  // Handle Mini-Tip display logic
  useEffect(() => {
    if (gameState.status === "ACTIVE" && gameState.question_id && gameState.question_id !== tipQuestionId && !hasVotedThisQuestion) {
      setShowMiniTip(true);
      setTipQuestionId(gameState.question_id);
      
      const timer = setTimeout(() => {
        setShowMiniTip(false);
      }, 8000);
      
      return () => clearTimeout(timer);
    } else if (gameState.status !== "ACTIVE" || hasVotedThisQuestion) {
      setShowMiniTip(false);
    }
  }, [gameState.status, gameState.question_id, tipQuestionId, hasVotedThisQuestion]);`;

let occurrences = content.split(badBlock);
console.log(`Found ${occurrences.length - 1} occurrences to fix.`);

if (occurrences.length > 1) {
  let newContent = occurrences[0];
  for (let i = 1; i < occurrences.length; i++) {
    if (i === 1) {
      // The first one was originally `  }, [seqToast]);`
      // Wait, we actually want to KEEP the first injected block!
      // So we append the badBlock as it was successfully injected.
      newContent += badBlock + occurrences[i];
    } else {
      // For all subsequent ones, we revert to `          }`
      newContent += `          }` + occurrences[i];
    }
  }
  fs.writeFileSync('src/components/AudienceView.tsx', newContent);
  console.log('Fixed file.');
}
