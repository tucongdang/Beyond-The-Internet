const fs = require('fs');
let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

// The replacements
const replacements = [
    { from: `localLanguage === 'en' ? 'REVEALED' : 'ĐÃ LẬT'`, to: `t("view_revealed", localLanguage)` },
    { from: `localLanguage === 'en' ? 'UNOPENED' : 'CHƯA MỞ'`, to: `t("view_unopened", localLanguage)` },
    { from: `localLanguage === 'en' ? 'YOU ARE ANSWERING RISK BOX!' : 'BẠN ĐANG TRẢ LỜI Ô MẠO HIỂM!'`, to: `t("view_risk_answering", localLanguage)` },
    { from: `localLanguage === 'en' ? 'CONTESTANT CHOSE RISK BOX!' : 'THÍ SINH ĐÃ CHỌN Ô MẠO HIỂM!'`, to: `t("view_risk_chosen", localLanguage)` },
    { from: `localLanguage === 'en' ? 'SUBMITTING ANSWER...' : 'ĐANG GỬI CÂU TRẢ LỜI...'`, to: `t("view_submitting_ans", localLanguage)` },
    { from: `localLanguage === 'en' ? 'SUBMITTED RISK ANSWER' : 'ĐÃ NỘP CÂU TRẢ LỜI Ô MẠO HIỂM'`, to: `t("view_submitted_risk", localLanguage)` },
    { from: `localLanguage === 'en' ? 'SYNCING PREDICTION...' : 'ĐANG ĐỒNG BỘ DỰ ĐOÁN...'`, to: `t("view_syncing_predict", localLanguage)` },
    { from: `localLanguage === 'en' ? 'RECORDED YOUR PREDICTION' : 'ĐÃ GHI NHẬN DỰ ĐOÁN Ô MẠO HIỂM CỦA BẠN'`, to: `t("view_recorded_predict", localLanguage)` },
    { from: `localLanguage === 'en' ? 'RISK BOX FROZEN' : 'ĐÃ ĐÓNG BĂNG Ô MẠO HIỂM'`, to: `t("view_risk_frozen", localLanguage)` },
    { from: `localLanguage === 'en' ? 'REVEALED' : 'ĐÃ CÔNG BỐ'`, to: `t("view_announced", localLanguage)` },
    { from: `localLanguage === 'en' ? '🎉 YOU GUESSED CORRECTLY!' : '🎉 BẠN ĐÃ DỰ ĐOÁN CHÍNH XÁC Ô MẠO HIỂM!'`, to: `t("view_guess_correct", localLanguage)` },
    { from: `localLanguage === 'en' ? '❌ INCORRECT PREDICTION' : '❌ DỰ ĐOÁN CHƯA CHÍNH XÁC'`, to: `t("view_guess_incorrect", localLanguage)` },
    { from: `localLanguage === 'en' ? 'PREDICTIONS CLOSED (WAITING FOR REVEAL)' : 'ĐÃ CHỐT NHẬN DỰ ĐOÁN (CHƯA CÔNG BỐ ĐÁP ÁN)'`, to: `t("view_predict_closed", localLanguage)` },
    { from: `localLanguage === 'en' ? 'SYNCING...' : 'ĐANG ĐỒNG BỘ...'`, to: `t("view_syncing", localLanguage)` },
    { from: `localLanguage === 'en' ? 'RECORDED' : 'ĐÃ GHI NHẬN'`, to: `t("view_recorded", localLanguage)` },
    { from: `localLanguage === 'en' ? 'DRAG & DROP OR CLICK TO SORT:' : 'KÉO THẢ HOẶC BẤM NÚT ĐỂ SẮP XẾP TRÌNH TỰ:'`, to: `t("view_drag_drop", localLanguage)` },
    { from: `localLanguage === 'en' ? \`RECORDED: \$\{selectedChoice\}\` : \`ĐÃ GHI NHẬN: \$\{selectedChoice\}\``, to: `t("view_recorded_val", localLanguage).replace("{val}", selectedChoice)` },
    { from: `localLanguage === 'en' ? 'SELECTED' : 'ĐÃ CHỌN'`, to: `t("view_selected", localLanguage)` },
    { from: `localLanguage === 'en' ? 'YOU CHOSE' : 'BẠN ĐÃ CHỌN'`, to: `t("view_you_chose", localLanguage)` },
    { from: `localLanguage === 'en' ? 'RESULT COMPARISON:' : 'BẢNG ĐỐI CHIẾU KẾT QUẢ TỪNG Ý:'`, to: `t("view_compare_result", localLanguage)` },
];

for (const r of replacements) {
    // Note: this assumes we only need global string replaces, but we can't do exact string replace with regex without escaping. 
    // We can just use split and join which acts as replaceAll.
    code = code.split(r.from).join(r.to);
}

fs.writeFileSync('src/components/AudienceView.tsx', code);
console.log("Patched AudienceView");
