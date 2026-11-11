# Kế hoạch Triển khai Tính năng: Khán Giả Dự Đoán & Đặt Cược Niềm Tin Thí Sinh

## 1. Mục tiêu
Bổ sung chế độ tương tác **Khán Giả Dự Đoán & Đặt Cược Niềm Tin Thí Sinh (Audience Confidence Staking Mode)** trực tiếp trên giao diện di động của Khán giả (`AudienceView.tsx`), tạo trải nghiệm giải trí học thuật cuốn hút, bám sát diễn biến từng trận đấu trên sân khấu.

---

## 2. Các điểm cốt lõi của Tính năng

### A. Cơ chế Đặt Cược Niềm Tin (Confidence Staking System)
- **Chọn Thí Sinh Sân Khấu**: Khán giả chọn 1 trong 4 Thí sinh (hoặc 4 Vị trí góc thi đấu trên sân khấu: *Thí sinh 1*, *Thí sinh 2*, *Thí sinh 3*, *Thí sinh 4*).
- **Hệ số Niềm tin (Confidence Multipliers)**: Khán giả chọn mức độ tin tưởng (*Tin tưởng nhẹ x1.5*, *Đồng hành x2.0*, *Đặt cược tuyệt đối x3.0*).
- **Thưởng Điểm & Huy hiệu Học thuật**:
  - Nếu Thí sinh được đặt cược đưa ra đáp án đúng hoặc bấm chuông giành quyền trả lời thành công, khán giả được cộng điểm thưởng trực tiếp vào Bảng Xếp Hạng Khán Giả.
  - Mở khóa Huy hiệu danh dự *"Nhà Dự Đoán Thiên Tài BTI 2027"* khi có 3 lần dự đoán chính xác liên tiếp.

### B. Giao diện Di động & Trải nghiệm Người dùng (`AudiencePredictionWidget.tsx`)
- **Thiết kế Cyber-Academic**: Khung thẻ góc vuông sắc nét (`rounded-[2px]`), bảng màu tím sẫm `#190839` và hồng thạch anh `#F7CAC9`.
- **Hiệu ứng Haptic & Âm thanh**: Phản hồi Rung haptic nhẹ (`vibrateSelection()`) khi đặt cược và âm thanh ăn mừng khi thí sinh được chọn chiến thắng.
- **Biểu đồ Tỷ lệ Tin tưởng Hội trường**: Hiển thị tỷ lệ phần trăm khán giả đặt niềm tin vào từng thí sinh dạng monospace tabular-nums thời gian thực.

---

## 3. Các bước triển khai
1. Tạo tiện ích quản lý dự đoán `src/utils/predictionUtils.ts`.
2. Xây dựng component `src/components/AudiencePredictionWidget.tsx` dành riêng cho di động.
3. Tích hợp widget dự đoán vào `AudienceView.tsx` và đồng bộ điểm thưởng lên hệ thống tính điểm khán giả (`audienceScoringService.ts`).
4. Kiểm tra biên dịch và linter bằng `compile_applet` và `lint_applet` để đảm bảo 0 lỗi.
