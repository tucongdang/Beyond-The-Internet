const fs = require('fs');

let adminCode = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const announcerRegex = /\{ \/\* Announcer Overlay Trigger \*\/ \} \n/;
// Wait, I will just match the announcer overlay button and inject the panic button after it.

const panicBtn = `
            {/* PANIC BUTTON */}
            <button
              type="button"
              id="btn-admin-header-panic"
              onClick={() => {
                const nextState = !gameState.panic_mode;
                syncService.updateGameState({ panic_mode: nextState });
                triggerHudToast('PANIC', nextState ? 'ĐÃ KÍCH HOẠT PANIC MODE' : 'Đã TẮT Panic Mode');
              }}
              data-tooltip="[PANIC MODE] Ẩn tất cả đáp án và khóa quyền gửi bài trên toàn bộ thiết bị khán giả ngay lập tức"
              data-tooltip-title="Khẩn Cấp"
              className={\`has-tooltip fluent-action-btn \${
                gameState.panic_mode
                  ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-900/50 ring-2 ring-red-500 animate-pulse'
                  : 'text-red-400 bg-red-950/40 hover:bg-red-900/50 border-red-500/30'
              }\`}
            >
              <AlertOctagon className={\`w-3.5 h-3.5 sm:w-4 sm:h-4 \${gameState.panic_mode ? 'text-white animate-bounce' : 'text-red-400'}\`} />
              <span className="font-bold">{gameState.panic_mode ? 'PANIC ON' : 'PANIC'}</span>
            </button>
`;

adminCode = adminCode.replace(/\{ \/\* Emergency Poll Control Modal \*\/ \}/g, "{ /* Emergency Poll Control Modal */ }");

const idx = adminCode.indexOf('{/* Announcer Overlay Trigger */}');
if (idx !== -1) {
    adminCode = adminCode.slice(0, idx) + panicBtn + adminCode.slice(idx);
}

fs.writeFileSync('src/components/AdminPortal.tsx', adminCode);
console.log("Patched AdminPortal.");
