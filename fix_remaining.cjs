const fs = require('fs');

let qaModal = fs.readFileSync('src/components/AudienceQAModal.tsx', 'utf8');
qaModal = qaModal.replace(/\{q\.upvotes \|\| 0\} lượt thích/g, '{q.upvotes || 0} {localLanguage === "en" ? "likes" : "lượt thích"}');
fs.writeFileSync('src/components/AudienceQAModal.tsx', qaModal);

let qaWidget = fs.readFileSync('src/components/AudienceQAWidget.tsx', 'utf8');
qaWidget = qaWidget.replace(/\{questions\.length\} câu hỏi trong hội trường/g, '{questions.length} {localLanguage === "en" ? "questions in hall" : "câu hỏi trong hội trường"}');
fs.writeFileSync('src/components/AudienceQAWidget.tsx', qaWidget);

let view = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');
view = view.replace(/\{stat\.D\} phiếu/g, '{stat.D} {localLanguage === "en" ? "votes" : "phiếu"}');
view = view.replace(/\{stat\.S\} phiếu/g, '{stat.S} {localLanguage === "en" ? "votes" : "phiếu"}');
fs.writeFileSync('src/components/AudienceView.tsx', view);

let sidebar = fs.readFileSync('src/components/AudienceDesktopSidebar.tsx', 'utf8');
sidebar = sidebar.replace(/>Phím F<\/span>/g, '>{localLanguage === "en" ? "F Key" : "Phím F"}</span>');
sidebar = sidebar.replace(/>Phím T<\/span>/g, '>{localLanguage === "en" ? "T Key" : "Phím T"}</span>');
sidebar = sidebar.replace(/>Phím S<\/span>/g, '>{localLanguage === "en" ? "S Key" : "Phím S"}</span>');
fs.writeFileSync('src/components/AudienceDesktopSidebar.tsx', sidebar);

let shout = fs.readFileSync('src/components/AudienceShoutModal.tsx', 'utf8');
shout = shout.replace(/Hô To Khán Giả <span/g, '{localLanguage === "en" ? "Audience Shout" : "Hô To Khán Giả"} <span');
fs.writeFileSync('src/components/AudienceShoutModal.tsx', shout);

let log = fs.readFileSync('src/components/AudienceQuestionLogModal.tsx', 'utf8');
log = log.replace(/\{stats\.totalCount\} câu</g, '{stats.totalCount} {localLanguage === "en" ? "qs" : "câu"}<');
log = log.replace(/\+\{stats\.totalPoints\}đ</g, '+{stats.totalPoints}{localLanguage === "en" ? "p" : "đ"}<');
fs.writeFileSync('src/components/AudienceQuestionLogModal.tsx', log);

let em = fs.readFileSync('src/components/EmergencyPollAudience.tsx', 'utf8');
em = em.replace(/\{item\.count\} phiếu/g, '{item.count} {localLanguage === "en" ? "votes" : "phiếu"}');
em = em.replace(/>Hãy chạm vào lựa chọn của bạn ở trên để bình chọn ngay</g, '>{localLanguage === "en" ? "Tap on your choice above to vote now" : "Hãy chạm vào lựa chọn của bạn ở trên để bình chọn ngay"}<');
fs.writeFileSync('src/components/EmergencyPollAudience.tsx', em);

let lucky = fs.readFileSync('src/components/LuckyDrawAudience.tsx', 'utf8');
lucky = lucky.replace(/>Mã định danh của bạn</g, '>{localLanguage === "en" ? "Your Identifier" : "Mã định danh của bạn"}<');
fs.writeFileSync('src/components/LuckyDrawAudience.tsx', lucky);
