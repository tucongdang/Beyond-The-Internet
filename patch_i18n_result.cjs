const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

// Vi
code = code.replace(/view_sort_req_name: "Vui lòng nhập tên/, 'view_tf_true: "ĐÚNG",\n    view_tf_false: "SAI",\n    view_result_correct: "CHÍNH XÁC TUYỆT ĐỐI!",\n    view_result_partial: "BẠN ĐÚNG {count}/4 Ý",\n    view_result_incorrect: "CHƯA CHÍNH XÁC!",\n    view_sort_req_name: "Vui lòng nhập tên');

// En
code = code.replace(/view_sort_req_name: "Please enter your name/, 'view_tf_true: "TRUE",\n    view_tf_false: "FALSE",\n    view_result_correct: "ABSOLUTELY CORRECT!",\n    view_result_partial: "YOU GOT {count}/4 CORRECT",\n    view_result_incorrect: "INCORRECT!",\n    view_sort_req_name: "Please enter your name');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n result feedback");
