const fs = require('fs');

const path = 'src/components/AudienceView.tsx';
let content = fs.readFileSync(path, 'utf8');

// The regex will match the button block and optionally the ShareGameModal right below it.
// Actually, ShareGameModal is already rendered at the very end of the component?
// Let's check where ShareGameModal is rendered.
