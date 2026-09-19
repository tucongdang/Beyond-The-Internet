const fs = require('fs');

let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

// Insert Vietnamese
code = code.replace(/view_enter_predict: "Nhập dự đoán Từ khóa Chướng Ngại Vật:",/, 'view_enter_predict: "Nhập dự đoán Từ khóa Chướng Ngại Vật:",\n    view_ph_predict_cnv: "VD: DEEPFAKE, BẢO MẬT DỮ LIỆU...",');

// Insert English
code = code.replace(/view_enter_predict: "Enter your Obstacles Keyword prediction:",/, 'view_enter_predict: "Enter your Obstacles Keyword prediction:",\n    view_ph_predict_cnv: "E.g. DEEPFAKE, DATA SECURITY...",');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n ph cnv");
