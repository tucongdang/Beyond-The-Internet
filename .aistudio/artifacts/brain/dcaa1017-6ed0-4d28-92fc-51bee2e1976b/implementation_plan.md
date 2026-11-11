# Kế hoạch Rà soát & Chuẩn hóa Thuật ngữ Toàn Hệ thống BTI 2027

## 1. Mục tiêu
Rà soát và tinh chỉnh 100% các thành phần văn bản trên toàn bộ giao diện (Admin Portal, Màn chiếu Sân khấu, Đấu trường Khán giả, các Modal quản trị và dịch vụ nền) nhằm loại bỏ triệt để các dấu vết rập khuôn ("AI", "Gemini", "Chatbot", "Co-pilot") và thay thế bằng bộ thuật ngữ **Chuyên môn & Học thuật Beyond The Internet 2027**.

---

## 2. Phạm vi rà soát & Chuẩn hóa chi tiết

### A. Khu vực Ban Quản Trị & Modal Điều hành (`AdminPortal`, `AdminPollManager`, `AdminSurveyControlModal`, `AiMcCoPilotModal`, `AiTranslationModal`)
- **Tên Modal & Nút bấm**: 
  - `AI MC Co-pilot` ➔ `Cố Vấn Kịch Bản MC Sân Khấu`
  - `Trợ Lý AI` / `Trợ Lý AI Tạo Câu Hỏi` ➔ `Khởi Tạo Đề Thi Khảo Thí` / `Công Cụ Đề Xuất Câu Hỏi`
  - `Dịch AI` / `Dịch AI Đa Ngôn Ngữ` ➔ `Chuyển Ngữ Đa Ngôn Ngữ Khảo Thí`
  - `Kịch Tình Huống AI` ➔ `Tình Huống Khảo Thí Thực Tế`
- **Mô tả & Hướng dẫn**: Thay toàn bộ các mô tả rập khuôn ("AI đang suy nghĩ...", "AI phân tích...") thành thuật ngữ chuyên môn ("Đang tổng hợp dữ liệu khảo thí...", "Đang phân tích tâm lý hội trường...").

### B. Khu vực Màn chiếu Sân khấu & Khán giả (`ProjectorView`, `ProjectorView_no_responsive`, `AudienceView`)
- **Thanh Ticker & Thẻ tình huống**: Chuẩn hóa thông điệp chữ chạy sân khấu và các thẻ thông báo theo chuẩn phát thanh truyền hình.
- **Hội đồng cố vấn**: Thống nhất danh xưng "Hội đồng Cố vấn BTI 2027" cho các phân tích căn cứ đáp án.

### C. Ngân hàng Đề thi & Dịch vụ Nền (`questionBank.ts`, `aiExplanationService.ts`, `syncService.ts`)
- Rà soát gợi ý Ô Mạo Hiểm (VCNV), văn bản giải thích đáp án và thông báo kết nối để đảm bảo văn phong tự nhiên, chính xác, không dùng từ ngữ rập khuôn.

---

## 3. Các bước triển khai
1. Sử dụng `grep` tìm kiếm triệt để tất cả các chuỗi văn bản còn sót lại.
2. Áp dụng `replace_file_content` / `multi_replace_file_content` để chỉnh sửa chính xác từng file.
3. Chạy kiểm tra toàn diện bằng `compile_applet` và `lint_applet` để đảm bảo 0 lỗi biên dịch và 0 lỗi TypeScript.
