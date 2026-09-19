const fs = require('fs');
let lb = fs.readFileSync('src/components/Leaderboard.tsx', 'utf8');

lb = lb.replace(/title=localLanguage === 'en' \? 'Export CSV' : 'Xuất bảng xếp hạng thí sinh ra file CSV \(Excel \/ SPSS\)'/g, "title={localLanguage === 'en' ? 'Export CSV' : 'Xuất bảng xếp hạng thí sinh ra file CSV (Excel / SPSS)'}");
lb = lb.replace(/title=localLanguage === 'en' \? 'Firework' : 'Bắn pháo hoa vinh danh'/g, "title={localLanguage === 'en' ? 'Firework' : 'Bắn pháo hoa vinh danh'}");
lb = lb.replace(/title=localLanguage === 'en' \? 'Back' : 'Quay lại câu hỏi sân khấu'/g, "title={localLanguage === 'en' ? 'Back' : 'Quay lại câu hỏi sân khấu'}");
lb = lb.replace(/title=localLanguage === 'en' \? 'Back to top' : 'Về đầu danh sách'/g, "title={localLanguage === 'en' ? 'Back to top' : 'Về đầu danh sách'}");

fs.writeFileSync('src/components/Leaderboard.tsx', lb);
console.log("Fixed missing curly brackets");
