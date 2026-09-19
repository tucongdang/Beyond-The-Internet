const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

code = code.replace('view_stmt_true: "Ý {key}: ĐÚNG",', 'view_there_are: "Có",\n    view_stmt_true: "Ý {key}: ĐÚNG",');
code = code.replace('view_stmt_true: "STMT {key}: TRUE",', 'view_there_are: "There are",\n    view_stmt_true: "STMT {key}: TRUE",');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n_misc_2");
