const fs = require('fs');
let content = fs.readFileSync('src/components/Leaderboard.tsx', 'utf8');

const target = `  // Launch celebratory confetti when Top 1 is crowned on mount
  useEffect(() => {
    if (top5Scorers.length > 0 && top5Scorers[0]?.totalScore > 0) {
      const timer = setTimeout(() => {
        triggerConfetti();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [roundFilter]);`;

content = content.replace(target, '');
fs.writeFileSync('src/components/Leaderboard.tsx', content);
