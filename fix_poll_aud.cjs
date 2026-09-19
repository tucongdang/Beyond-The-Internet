const fs = require('fs');
let poll = fs.readFileSync('src/components/EmergencyPollAudience.tsx', 'utf8');

poll = poll.replace(/\{localLanguage === 'en' \? 'Your opinion has been recorded in the live system!' : '\{localLanguage === 'en' \? 'Your opinion has been recorded in the live system!' : 'Ý kiến của bạn đã được ghi nhận vào hệ thống live!'\}'\}/g, "{localLanguage === 'en' ? 'Your opinion has been recorded in the live system!' : 'Ý kiến của bạn đã được ghi nhận vào hệ thống live!'}");

poll = poll.replace(/\{localLanguage === 'en' \? 'Tap on your choice above to vote now' : '\{localLanguage === 'en' \? 'Tap on your choice above to vote now' : 'Hãy chạm vào lựa chọn của bạn ở trên để bình chọn ngay'\}'\}/g, "{localLanguage === 'en' ? 'Tap on your choice above to vote now' : 'Hãy chạm vào lựa chọn của bạn ở trên để bình chọn ngay'}");

fs.writeFileSync('src/components/EmergencyPollAudience.tsx', poll);
console.log("Fixed poll aud");
