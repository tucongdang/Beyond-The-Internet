const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

// import Globe
content = content.replace("Keyboard,", "Keyboard, Globe,");

const target = `<button
              type="button"
              id="btn-admin-header-shortcuts"`;

const replacement = `<button
              type="button"
              onClick={() => {
                adminService.updateGameState({ language: gameState?.language === 'en' ? 'vi' : 'en' });
              }}
              data-tooltip="Chuyển đổi ngôn ngữ hiển thị cho khán giả"
              className="has-tooltip fluent-action-btn text-blue-300 bg-blue-950/30 hover:bg-blue-900/40 border-blue-500/30"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
              <span>{gameState?.language === 'en' ? 'EN' : 'VI'}</span>
            </button>
            <button
              type="button"
              id="btn-admin-header-shortcuts"`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/AdminPortal.tsx', content);
