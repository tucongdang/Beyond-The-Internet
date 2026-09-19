const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

// I inserted them in the block. I can just search and replace them in the first half and second half.
// Since there's one block for vi and one for en, let's just replace the ones in my recently added block.
// Wait, I can just replace `view_recorded_predict:` with `view_recorded_predict_risk:` inside the file entirely? No, that would break the ones that were using `view_recorded_predict` in the app.
// I will just replace the exact line I added.
code = code.replace(/view_recorded_predict: "ĐÃ GHI NHẬN DỰ ĐOÁN Ô MẠO HIỂM CỦA BẠN"/, 'view_recorded_predict_risk: "ĐÃ GHI NHẬN DỰ ĐOÁN Ô MẠO HIỂM CỦA BẠN"');
code = code.replace(/view_recorded_predict: "RECORDED YOUR PREDICTION"/, 'view_recorded_predict_risk: "RECORDED YOUR PREDICTION"');

code = code.replace(/view_you_chose: "BẠN ĐÃ CHỌN"/, 'view_you_chose_final: "BẠN ĐÃ CHỌN"');
code = code.replace(/view_you_chose: "YOU CHOSE"/, 'view_you_chose_final: "YOU CHOSE"');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Fixed dupes in i18n");

let aud = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');
aud = aud.replace(/t\("view_recorded_predict", localLanguage\)/g, 't("view_recorded_predict_risk", localLanguage)');
aud = aud.replace(/t\("view_you_chose", localLanguage\)/g, 't("view_you_chose_final", localLanguage)');
fs.writeFileSync('src/components/AudienceView.tsx', aud);
console.log("Fixed dupes in AudienceView");
