# Trợ Lý Khán Giả AI (BTI 2026 Official Tournament Assistant)

Kế hoạch triển khai Chatbot AI thông minh đa lượt (multi-turn) sử dụng mô hình **Gemini 3.8 Flash** nhằm hướng dẫn luật thi đấu 4 vòng, cách tính điểm, hỗ trợ xử lý sự cố kết nối mạng và cung cấp thông tin sự kiện Beyond The Internet 2026 — tích hợp cơ chế bảo vệ đề thi nghiêm ngặt chống gian lận trong thời gian diễn ra trận đấu.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Dựa trên phản hồi phỏng vấn làm rõ yêu cầu từ người dùng, hệ thống đã thống nhất các quyết định kiến trúc then chốt sau:

- **Vị trí & Hình thức hiển thị (Confirmed)**: Bong bóng nổi (Floating Action Bubble) ở góc phải phía dưới màn hình khán giả (`fixed bottom-20 right-4 sm:right-6 z-40`), có thể thu nhỏ hoặc mở rộng thành cửa sổ chat Glassmorphism chuẩn Square UI mà không che khuất các nút chọn đáp án A/B/C/D khi câu hỏi đang diễn ra.
- **Chính sách Phòng Chống Gian Lận (Confirmed)**: Tuyệt đối không cung cấp đáp án, gợi ý hoặc giải mã các câu hỏi thi đấu đang diễn ra. Hệ thống chỉ dẫn prompt hệ thống (System Instruction) gắn kèm bối cảnh trạng thái trận đấu theo thời gian thực để từ chối lịch sự và giải thích nguyên tắc công bằng của giải đấu.
- **Gói câu hỏi nhanh gợi ý sẵn (Confirmed)**:
  1. Luật thi 4 vòng đấu & bảng quy tắc tính điểm.
  2. Hướng dẫn kết nối mạng, tải lại trang và bảo lưu điểm khi gặp sự cố.
  3. Thông tin thể lệ sự kiện Beyond The Internet 2026 và cơ cấu giải thưởng.

---

## 1. Overview & Core Concept

- **Mục tiêu sản phẩm**: Cung cấp cho khán giả tại hội trường một người bạn đồng hành AI luôn túc trực trên điện thoại, giải đáp tức thì mọi thắc mắc về thể lệ trận đấu, kỹ thuật và giải thưởng bằng ngôn ngữ tự nhiên thân thiện, giúp khán giả yên tâm tham gia mà không làm gián đoạn ban tổ chức.
- **Đối tượng người dùng**: Hơn 100+ khán giả tham gia tương tác trực tiếp trên thiết bị di động (smartphone/tablet).
- **Nguyên tắc cốt lõi (Anti-Cheat & Fair Play)**: Trợ lý AI chỉ đóng vai trò hướng dẫn viên và hỗ trợ kỹ thuật viên. Bất kỳ câu hỏi nào yêu cầu giải câu đố, tìm đáp án đúng A/B/C/D, hoặc phân tích câu hỏi đang hiển thị trên màn chiếu sẽ bị từ chối ngay lập tức theo quy định bảo mật đề thi.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Khám phá & Kích hoạt**: Khán giả nhìn thấy nút bong bóng chat tròn/vuông vắn mang sắc tím - vàng đồng nhạt huyền ảo (`#F7CAC9` / `#3E1D74`) ở góc phải màn hình điện thoại với biểu tượng trợ lý lấp lánh và huy hiệu thông báo "Trợ Lý BTI".
2. **Mở Hộp Thoại Chat**: Nhấn vào nút sẽ bung mở mượt mà cửa sổ Chat Drawer (`max-w-md w-[92vw] sm:w-[380px] h-[520px] max-h-[80vh]`) với hiệu ứng `backdrop-blur-2xl`, bo góc tinh tế (`rounded-[4px]`) đồng bộ ngôn ngữ Fluent Square Glassmorphism của ứng dụng.
3. **Tương tác 1-Chạm qua Prompt Chips**: Khi mới mở, chatbot chào mừng khán giả theo tên thật/MSSV đã đăng nhập và hiển thị 4 nút câu hỏi nhanh:
   - ⚡ *"Luật thi 4 vòng & cách tính điểm?"*
   - 🧩 *"Cách chơi Chướng Ngại Vật & Ô Mạo Hiểm?"*
   - 📶 *"Bị mất kết nối mạng thì làm sao?"*
   - 🎁 *"Cơ cấu giải thưởng & nhận quà BTI?"*
4. **Hội thoại Đa Lượt (Multi-turn Stream/Thread)**: Khán giả có thể trò chuyện tự nhiên bằng tiếng Việt hoặc tiếng Anh. Cuộc trò chuyện được cuộn mượt mà, lưu lịch sử trong phiên làm việc, có chỉ báo "Đang soạn câu trả lời..." sống động.
5. **Cơ chế Chống Gian Lận Trực Tiếp**:
   - Nếu khán giả gửi tin nhắn như: *"Câu 5 đáp án là gì?", "Gợi ý câu này giúp tôi", "Chọn A hay B?"* -> Chatbot lập tức phản hồi: *"🛡️ Vì tính công bằng của Đấu trường Beyond The Internet 2026, mình không thể tiết lộ đáp án hoặc gợi ý cho các câu hỏi thi đấu. Hãy tập trung vào trực giác và kiến thức của bạn nhé! Chúc bạn đạt điểm cao!"*
6. **Thu nhỏ linh hoạt khi làm bài thi**: Khi câu hỏi mới bắt đầu đếm ngược, chatbot tự động hiển thị gợi ý thu nhỏ hoặc khán giả có thể đóng nhanh chỉ với 1 chạm để toàn tâm trả lời câu hỏi trắc nghiệm.

### Visual Identity & Theme Tokens
- **Bảng màu**: Nền tối sâu `from-[#170a2c]/95 via-[#0e041e]/98 to-[#1a082c]/95`, viền hairline siêu mảnh `border-[#F7CAC9]/30`, điểm nhấn màu Rose Quartz (`#F7CAC9`) và Sky Blue (`#38bdf8`).
- **Typography**: Font hiển thị tiếng Việt sắc nét, tiêu đề font-bold `tracking-tight`, các thông số quy tắc tabular-nums.
- **Phản hồi xúc giác & âm thanh**: Tích hợp haptic feedback (`vibrateTap`) và sound FX vui nhộn khi gửi tin nhắn hoặc nhận phản hồi.

---

## 3. Key Product Decisions & Trade-Offs

- **Server-Side Proxy Architecture (`/api/audience-chat`)**:
  - *Quyết định*: Toàn bộ cuộc gọi đến Gemini API (`@google/genai`) được xử lý an toàn tại backend Node.js/Express qua route `/api/audience-chat`, không bao giờ để lộ `GEMINI_API_KEY` cho client.
  - *Lý do*: Tuân thủ tiêu chuẩn bảo mật hệ thống và hướng dẫn của Gemini SDK, bảo vệ hạn mức quota và chống giả mạo prompt từ phía client.
- **Lựa chọn mô hình `gemini-3.8-flash`**:
  - *Quyết định*: Sử dụng mô hình `gemini-3.8-flash` làm mô hình cốt lõi theo chỉ định cấu hình, kết hợp circuit breaker fallback tự động sang `gemini-3.1-flash-lite` khi tải cao.
  - *Lý do*: Đảm bảo thời gian phản hồi cực nhanh (<1.5 giây), văn phong tiếng Việt tự nhiên, tuân thủ hướng dẫn nghiêm ngặt của System Instruction.
- **Quản lý bối cảnh & phiên làm việc**:
  - *Quyết định*: Lưu trữ `messages` thread trong `sessionStorage` của khán giả và truyền lịch sử gần nhất (tối đa 8 lượt hội thoại gần nhất) lên backend để giữ ngữ cảnh liền mạch mà không làm phình dung lượng payload.
  - *Lý do*: Tiết kiệm băng thông di động 4G/5G tại hội trường đông người, đồng thời duy trì sự thông minh theo dõi mạch câu hỏi của khán giả.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUDIENCE CLIENT (MOBILE)                        │
│                                                                        │
│   ┌────────────────────────────────┐  ┌────────────────────────────┐   │
│   │   AudienceView.tsx             │  │   AudienceChatbot.tsx      │   │
│   │   - Trực tiếp câu hỏi A/B/C/D  │  │   - Floating Toggle Bubble │   │
│   │   - Đồng hồ đếm ngược          │◄─┤   - Multi-turn Message Log │   │
│   │   - Tự thu nhỏ khi đang thi    │  │   - Quick Question Chips   │   │
│   └────────────────────────────────┘  │   - Client Anti-Cheat Hint │   │
│                                       └──────────────┬─────────────┘   │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ POST /api/audience-chat
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS BACKEND (SERVER.TS)                       │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   /api/audience-chat Handler                                   │   │
│   │   - Validate payload & Rate-limit token bucket                 │   │
│   │   - Inject Tournament Knowledge & Current Match Status         │   │
│   │   - Strict Anti-Cheat System Instruction Enforcement           │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │ ai.models.generateContent         │
│                                    ▼                                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   @google/genai SDK (models/gemini-3.8-flash)                  │   │
│   │   - Fallback: gemini-3.1-flash-lite / gemini-flash-latest      │   │
│   │   - Header User-Agent: 'aistudio-build'                        │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Knowledge Base & System Instruction Specification
Chatbot được trang bị đầy đủ tài liệu thể lệ giải đấu được nhúng trực tiếp trong System Instruction:
1. **Thông tin chung**: Cuộc thi học thuật công nghệ & an ninh mạng Beyond The Internet 2026.
2. **Thể lệ 4 Vòng đấu**:
   - *Vòng 1 (Khởi Động)*: 45 câu hỏi trắc nghiệm tốc độ, mỗi câu 10 điểm, trả lời trong 20s - 30s.
   - *Vòng 2 (Vượt Chướng Ngại Vật)*: 4 từ hàng ngang gợi ý và 1 từ khóa trung tâm. Điểm hàng ngang +20đ, giải đúng từ khóa +100đ, đoán đúng Ô Mạo Hiểm +120đ.
   - *Vòng 3 (Tăng Tốc)*: 4 câu hỏi trắc nghiệm loại trừ 6 đáp án (tự động loại 2 phương án sai sau mỗi 10s) hoặc sắp xếp chuỗi logic. Điểm thưởng cao theo tốc độ nộp bài.
   - *Vòng 4 (Về Đích)*: Gói câu hỏi điểm số (20-30 điểm), tính năng Ngôi Sao Hy Vọng (nhân đôi điểm nếu đúng, trừ điểm nếu sai).
3. **Cơ chế chống rò rỉ đề thi**:
   - Chatbot không bao giờ tiếp cận ngân hàng đáp án chính xác của đề thi hiện tại.
   - Khi nhận được câu hỏi có dấu hiệu hỏi bài hoặc nhắc đến các phương án trắc nghiệm, chatbot lập tức từ chối và khích lệ khán giả tự tin thi đấu.
4. **Hỗ trợ xử lý sự cố**:
   - Khuyên khán giả không tắt tab hoặc chuyển ứng dụng để tránh kích hoạt cảnh báo rời màn hình (Anti-Exit Guard).
   - Nếu mạng lag hoặc ngắt kết nối, chỉ cần nhấn nút "Đồng bộ" trên thanh Navbar hoặc tải lại trang, điểm số và mã định danh UID được bảo lưu nguyên vẹn 100% trên Firestore.
