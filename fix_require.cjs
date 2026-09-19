const fs = require('fs');
let content = fs.readFileSync('src/services/syncService.ts', 'utf8');

if (!content.includes("import { calculateLeaderboard } from '../utils/leaderboardUtils';")) {
    content = content.replace(
        "import { INITIAL_QUESTION_BANK } from '../data/questionBank';",
        "import { INITIAL_QUESTION_BANK } from '../data/questionBank';\nimport { calculateLeaderboard } from '../utils/leaderboardUtils';"
    );
}

content = content.replace(
    "    const { calculateLeaderboard } = require('../utils/leaderboardUtils');\n",
    ""
);

fs.writeFileSync('src/services/syncService.ts', content);
