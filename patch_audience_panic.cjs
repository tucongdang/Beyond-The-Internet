const fs = require('fs');

let audienceCode = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

const panicBlock = `
  if (gameState.panic_mode) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center relative z-[999] bg-red-950/90 backdrop-blur-md p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-600/20 flex items-center justify-center animate-pulse">
            <AlertOctagon className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-red-400 tracking-widest uppercase">HỆ THỐNG TẠM DỪNG</h2>
          <p className="text-red-300/80 text-sm leading-relaxed">
            Quyền tương tác hiện đang bị khóa bởi Quản trị viên do có yêu cầu khẩn cấp. Mọi bài thi đã nộp vẫn được bảo lưu an toàn.
            <br/><br/>
            Vui lòng làm theo hướng dẫn của MC hoặc chờ thông báo tiếp theo.
          </p>
        </div>
      </div>
    );
  }
`;

audienceCode = audienceCode.replace(/const renderContent = \(\) => \{\n/, "const renderContent = () => {\n" + panicBlock);

fs.writeFileSync('src/components/AudienceView.tsx', audienceCode);
console.log("Patched AudienceView with Panic Mode.");
