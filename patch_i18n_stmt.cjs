const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

// Vi
code = code.replace(/view_sort_req_name: "Vui lòng nhập tên/, 'view_stmt_true: "Ý {key}: ĐÚNG",\n    view_stmt_false: "Ý {key}: SAI",\n    view_sort_req_name: "Vui lòng nhập tên');

// En
code = code.replace(/view_sort_req_name: "Please enter your name/, 'view_stmt_true: "STMT {key}: TRUE",\n    view_stmt_false: "STMT {key}: FALSE",\n    view_sort_req_name: "Please enter your name');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n stmt keys");
