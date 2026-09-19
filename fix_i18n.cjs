const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

if (!code.includes('view_shout: "Hô to"')) {
    code = code.replace(/view_contest: "Cuộc thi",/g, 'view_contest: "Cuộc thi",\n    view_shout: "Hô to",');
    code = code.replace(/view_contest: "Contest",/g, 'view_contest: "Contest",\n    view_shout: "Shout",');
}

fs.writeFileSync('src/utils/i18n.ts', code);
