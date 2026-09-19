const fs = require('fs');
let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

// 1. Add spamCounters property
code = code.replace(/private isFirebaseConnected = false;/, "private isFirebaseConnected = false;\n  private spamCounters: Record<string, number> = {};");

// 2. Replace filterInappropriateWords with checkAndFilterSpam
const filterRegex = /private filterInappropriateWords\(text: string\): string \{[\s\S]*?return filteredText;\n  \}/;

const newFilter = `private checkAndFilterSpam(text: string): { isSpam: boolean, filteredText: string } {
    if (!text) return { isSpam: false, filteredText: text };
    let filteredText = text;
    let isSpam = false;
    
    // 1. Lọc từ cấm
    this.FORBIDDEN_WORDS.forEach(word => {
      const regex = new RegExp(word, 'gi');
      if (regex.test(filteredText)) {
        isSpam = true;
        filteredText = filteredText.replace(regex, '***');
      }
    });

    // 2. Lọc spam ký tự lặp lại (ví dụ: aaaaa, 11111) hoặc quá dài vô nghĩa
    if (/(.)\\1{4,}/.test(text)) {
      isSpam = true;
      filteredText = '*** SPAM ***';
    }

    return { isSpam, filteredText };
  }`;

code = code.replace(filterRegex, newFilter);

// 3. Update submitResponse
const submitRegex = /if \(isTextEntry && processedResponse\.choice\) \{\s*processedResponse\.choice = this\.filterInappropriateWords\(processedResponse\.choice\);\s*\}/;

const newSubmit = `if (isTextEntry && processedResponse.choice) {
      const { isSpam, filteredText } = this.checkAndFilterSpam(processedResponse.choice);
      processedResponse.choice = filteredText;
      
      if (isSpam) {
        if (!this.spamCounters[questionId]) this.spamCounters[questionId] = 0;
        this.spamCounters[questionId]++;
        
        // Cảnh báo Admin nếu có quá nhiều câu trả lời spam/vi phạm (ngưỡng = 5)
        if (this.spamCounters[questionId] === 5) {
          this.sendGlobalNotification(
            \`Hệ thống Auto-Moderation phát hiện nhiều câu trả lời điền từ có dấu hiệu spam hoặc vi phạm từ ngữ ở câu hỏi hiện tại. Vui lòng kiểm tra!\`,
            'Cảnh Báo Auto-Moderation',
            'ALERT'
          );
          this.logActivity(
            'SYSTEM_ALERT', 
            'Auto-Moderation', 
            \`Đã đạt ngưỡng 5 câu trả lời vi phạm/spam ở câu hỏi \${questionId}.\`, 
            { questionId, spamCount: this.spamCounters[questionId] }
          );
        }
      }
    }`;

code = code.replace(submitRegex, newSubmit);

fs.writeFileSync('src/services/syncService.ts', code);
console.log("Patched syncService.ts");
