const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

const viKeys = `    view_revealed: "ĐÃ LẬT",
    view_unopened: "CHƯA MỞ",
    view_risk_answering: "BẠN ĐANG TRẢ LỜI Ô MẠO HIỂM!",
    view_risk_chosen: "THÍ SINH ĐÃ CHỌN Ô MẠO HIỂM!",
    view_submitting_ans: "ĐANG GỬI CÂU TRẢ LỜI...",
    view_submitted_risk: "ĐÃ NỘP CÂU TRẢ LỜI Ô MẠO HIỂM",
    view_syncing_predict: "ĐANG ĐỒNG BỘ DỰ ĐOÁN...",
    view_recorded_predict: "ĐÃ GHI NHẬN DỰ ĐOÁN Ô MẠO HIỂM CỦA BẠN",
    view_risk_frozen: "ĐÃ ĐÓNG BĂNG Ô MẠO HIỂM",
    view_announced: "ĐÃ CÔNG BỐ",
    view_guess_correct: "🎉 BẠN ĐÃ DỰ ĐOÁN CHÍNH XÁC Ô MẠO HIỂM!",
    view_guess_incorrect: "❌ DỰ ĐOÁN CHƯA CHÍNH XÁC",
    view_predict_closed: "ĐÃ CHỐT NHẬN DỰ ĐOÁN (CHƯA CÔNG BỐ ĐÁP ÁN)",
    view_syncing: "ĐANG ĐỒNG BỘ...",
    view_recorded: "ĐÃ GHI NHẬN",
    view_drag_drop: "KÉO THẢ HOẶC BẤM NÚT ĐỂ SẮP XẾP TRÌNH TỰ:",
    view_recorded_val: "ĐÃ GHI NHẬN: {val}",
    view_selected: "ĐÃ CHỌN",
    view_you_chose: "BẠN ĐÃ CHỌN",
    view_compare_result: "BẢNG ĐỐI CHIẾU KẾT QUẢ TỪNG Ý:",`;

const enKeys = `    view_revealed: "REVEALED",
    view_unopened: "UNOPENED",
    view_risk_answering: "YOU ARE ANSWERING RISK BOX!",
    view_risk_chosen: "CONTESTANT CHOSE RISK BOX!",
    view_submitting_ans: "SUBMITTING ANSWER...",
    view_submitted_risk: "SUBMITTED RISK ANSWER",
    view_syncing_predict: "SYNCING PREDICTION...",
    view_recorded_predict: "RECORDED YOUR PREDICTION",
    view_risk_frozen: "RISK BOX FROZEN",
    view_announced: "REVEALED",
    view_guess_correct: "🎉 YOU GUESSED CORRECTLY!",
    view_guess_incorrect: "❌ INCORRECT PREDICTION",
    view_predict_closed: "PREDICTIONS CLOSED (WAITING FOR REVEAL)",
    view_syncing: "SYNCING...",
    view_recorded: "RECORDED",
    view_drag_drop: "DRAG & DROP OR CLICK TO SORT:",
    view_recorded_val: "RECORDED: {val}",
    view_selected: "SELECTED",
    view_you_chose: "YOU CHOSE",
    view_compare_result: "RESULT COMPARISON:",`;

code = code.replace(/view_stmt_true: "Ý \{key\}: ĐÚNG",/, `${viKeys}\n    view_stmt_true: "Ý {key}: ĐÚNG",`);
code = code.replace(/view_stmt_true: "STMT \{key\}: TRUE",/, `${enKeys}\n    view_stmt_true: "STMT {key}: TRUE",`);

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n_final_checks");
