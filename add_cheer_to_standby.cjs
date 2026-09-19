const fs = require('fs');
let content = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

const target = `            <div className="mt-6 text-[11px] text-slate-500">
              Hệ thống sẽ tự động chuyển sang chế độ bình chọn ngay khi MC bấm giờ trên sân khấu.
            </div>`;

const replacement = `            <div className="mt-6 mb-2">
              <AudienceCheerButton user={user} isHighContrast={isHighContrast} />
            </div>
            <div className="mt-4 text-[11px] text-slate-500">
              Hệ thống sẽ tự động chuyển sang chế độ bình chọn ngay khi MC bấm giờ trên sân khấu.
            </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/AudienceView.tsx', content);
