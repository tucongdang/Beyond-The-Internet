import { QuestionItem } from '../types';

export const INITIAL_QUESTION_BANK: QuestionItem[] = [
  // =========================================================================
  // PHẦN 1: 45 CÂU HỎI KHỞI ĐỘNG (KD_01 -> KD_45)
  // Kết hợp Trắc nghiệm 4 phương án (MULTIPLE_CHOICE) và Trả lời ngắn (SHORT_ANSWER)
  // =========================================================================
  {
    id: 'KD_01',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Miền IV: An toàn số & Chống giả mạo',
    question_text: 'Sinh viên nhận được email thông báo học bổng với đường dẫn "https://portal.ued-udn.com.vn/scholarship-verify". Dấu hiệu nào chứng minh đây là email giả mạo (Phishing)?',
    options: {
      A: 'Đuôi tên miền không thuộc máy chủ chính thức của trường (.edu.vn)',
      B: 'Trang web sử dụng giao thức bảo mật mã hóa HTTPS',
      C: 'Nội dung email yêu cầu xác thực bằng mã OTP tài khoản ngân hàng',
      D: 'Cả A và C đều là dấu hiệu lừa đảo nguy hiểm'
    },
    correct_key: 'D',
    explanation: 'Theo Chuẩn an toàn thông tin Thông tư 02/TT-BTTTT: Các tên miền giáo dục đại học chính thức luôn sử dụng phần mở rộng `.edu.vn`. Kẻ gian thường mua tên miền gần giống (.com, .vn) và lợi dụng giao thức HTTPS để tạo vỏ bọc uy tín, đồng thời khai thác tâm lý muốn nhận học bổng gấp để chiếm đoạt OTP.',
    time_limit: 15
  },
  {
    id: 'KD_02',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Miền I: Nhận diện Deepfake & Kỹ xảo AI',
    question_text: 'Khi nhận cuộc gọi Video Call từ bạn thân vay tiền gấp do tai nạn, đặc điểm nào sau đây KHẲNG ĐỊNH có sự can thiệp của công nghệ Hoán đổi khuôn mặt (Deepfake Face Swap)?',
    options: {
      A: 'Hình ảnh có độ phân giải cao, giọng nói rất trong trẻo',
      B: 'Vùng biên khuôn mặt nhấp nháy, khẩu hình miệng không khớp tự nhiên với âm vị tiếng Việt',
      C: 'Thời lượng cuộc gọi kéo dài hơn 15 phút với nhiều góc quay',
      D: 'Người gọi yêu cầu chuyển khoản về chính số tài khoản ngân hàng đã lưu trước đây'
    },
    correct_key: 'B',
    explanation: 'Bóc tách bẫy kỹ thuật: Deepfake thời gian thực thường gặp lỗi render đường viền khuôn mặt (boundary artifacts), mắt ít chớp tự nhiên hoặc không chớp theo nhịp sinh lý, và khẩu hình (lip-sync) bị lệch pha so với âm thanh các âm tiết tiếng Việt có dấu.',
    time_limit: 15
  },
  {
    id: 'KD_03',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Pháp luật An ninh mạng 2018 & NĐ 13/2023',
    question_text: 'Hành vi tự ý thu thập, đăng tải danh sách điểm thi kèm số CCCD của sinh viên lên hội nhóm mạng xã hội khi chưa có sự đồng ý vi phạm quy định nào?',
    options: {
      A: 'Chỉ vi phạm nội quy riêng của cơ sở đào tạo, không có chế tài pháp luật',
      B: 'Vi phạm quyền bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP',
      C: 'Vi phạm điều ước quốc tế về bản quyền sở hữu trí tuệ',
      D: 'Không vi phạm nếu nhằm mục đích minh bạch kết quả học tập'
    },
    correct_key: 'B',
    explanation: 'Nghị định 13/2023/NĐ-CP quy định CCCD và dữ liệu học tập là dữ liệu cá nhân cần được bảo vệ. Việc công khai trên không gian mạng khi chưa có văn bản đồng ý của chủ thể dữ liệu là hành vi xâm phạm quyền riêng tư và bị xử phạt hành chính theo Nghị định 14/2022/NĐ-CP.',
    time_limit: 15
  },
  {
    id: 'KD_04',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Xác thực & Bảo mật tài khoản',
    question_text: 'Viết tắt tiếng Anh của cơ chế "Xác thực 2 yếu tố" là gì?',
    options: {},
    correct_key: '2FA',
    explanation: '2FA (Two-Factor Authentication) là phương thức xác thực yêu cầu hai hình thức nhận dạng riêng biệt trước khi cấp quyền truy cập tài khoản.',
    time_limit: 15
  },
  {
    id: 'KD_05',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Phần mềm độc hại & Tống tiền',
    question_text: 'Loại mã độc nào chuyên mã hóa toàn bộ tệp tin trên máy tính nạn nhân và đòi tiền chuộc bằng tiền ảo?',
    options: {
      A: 'Spyware (Phần mềm gián điệp)',
      B: 'Ransomware (Mã độc tống tiền)',
      C: 'Adware (Phần mềm quảng cáo rác)',
      D: 'Keylogger (Trình theo dõi bàn phím)'
    },
    correct_key: 'B',
    explanation: 'Ransomware là phần mềm độc hại mã hóa dữ liệu người dùng và yêu cầu nạn nhân chuyển tiền chuộc qua tiền mã hóa để nhận chìa khóa giải mã.',
    time_limit: 15
  },
  {
    id: 'KD_06',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Văn hóa ứng xử không gian mạng',
    question_text: 'Hành vi "Doxxing" trên mạng xã hội được định nghĩa chính xác là gì?',
    options: {
      A: 'Hành vi gửi mã độc tống tiền qua email',
      B: 'Cố ý tìm kiếm và công khai thông tin cá nhân riêng tư của người khác nhằm đe dọa hoặc quấy rối',
      C: 'Tạo tài khoản ảo để tăng tương tác bài viết',
      D: 'Chặn tin nhắn của người lạ trên Facebook'
    },
    correct_key: 'B',
    explanation: 'Doxxing là hành vi độc hại nhằm thu thập và phát tán công khai thông tin nhận dạng cá nhân (địa chỉ, số điện thoại, người thân) của nạn nhân lên internet mà không có sự đồng thuận.',
    time_limit: 15
  },
  {
    id: 'KD_07',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Mật mã & Mật khẩu',
    question_text: 'Độ dài tối thiểu khuyến nghị cho một mật khẩu mạnh chuẩn an toàn quốc tế là bao nhiêu ký tự?',
    options: {},
    correct_key: '12',
    explanation: 'Chuẩn NIST SP 800-63B khuyến nghị độ dài mật khẩu tối thiểu 12 đến 16 ký tự bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
    time_limit: 15
  },
  {
    id: 'KD_08',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Kỹ năng mạng Wifi công cộng',
    question_text: 'Khi bắt buộc phải sử dụng Wifi miễn phí không có mật khẩu tại quán cà phê, giải pháp nào giúp mã hóa toàn bộ dữ liệu duyệt web?',
    options: {
      A: 'Bật chế độ ẩn danh (Incognito Mode)',
      B: 'Sử dụng mạng riêng ảo VPN (Virtual Private Network)',
      C: 'Giảm độ sáng màn hình điện thoại',
      D: 'Tắt định vị GPS'
    },
    correct_key: 'B',
    explanation: 'VPN tạo một đường hầm mã hóa dữ liệu giữa thiết bị của bạn và máy chủ đích, ngăn chặn kẻ xấu trong cùng mạng Wifi nghe lén (Man-in-the-Middle). Chế độ ẩn danh chỉ xóa lịch sử cục bộ trên trình duyệt.',
    time_limit: 15
  },
  {
    id: 'KD_09',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Kỹ xảo & Đạo đức AI',
    question_text: 'Thuật ngữ "Hallucination" (Ảo giác AI) trong các mô hình ngôn ngữ lớn (LLM) ám chỉ hiện tượng gì?',
    options: {
      A: 'Mô hình AI bị virus xâm nhập và ngừng hoạt động',
      B: 'AI tạo ra thông tin sai lệch, không có thật nhưng trình bày rất tự tin và trôi chảy',
      C: 'Mô hình AI tự động xóa cơ sở dữ liệu của người dùng',
      D: 'Mô hình AI nhận diện giọng nói cực kỳ chính xác'
    },
    correct_key: 'B',
    explanation: 'AI Hallucination là hiện tượng mô hình AI sinh ra các khẳng định hoặc nguồn trích dẫn hoàn toàn bịa đặt nhưng ngữ pháp rất mượt mà, gây nguy cơ phát tán thông tin sai lệch.',
    time_limit: 15
  },
  {
    id: 'KD_10',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Giao thức bảo mật Web',
    question_text: 'Chữ cái "S" trong giao thức mạng an toàn "HTTPS" viết tắt của từ tiếng Anh nào?',
    options: {},
    correct_key: 'SECURE',
    explanation: 'HTTPS là viết tắt của Hypertext Transfer Protocol Secure (Giao thức truyền tải siêu văn bản an toàn).',
    time_limit: 15
  },
  {
    id: 'KD_11',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Luật An ninh mạng 2018',
    question_text: 'Theo Luật An ninh mạng Việt Nam 2018, cơ quan nào có thẩm quyền chuyên trách bảo vệ an ninh mạng đối với hệ thống thông tin quốc gia?',
    options: {
      A: 'Cục An toàn thông tin (Bộ TT&TT) và Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao - A05 (Bộ Công an)',
      B: 'Bộ Văn hóa, Thể thao và Du lịch',
      C: 'Ủy ban nhân dân các cấp',
      D: 'Tổng cục Du lịch Việt Nam'
    },
    correct_key: 'A',
    explanation: 'Bộ Công an (A05) và Bộ Quốc phòng, cùng Bộ Thông tin & Truyền thông là các lực lượng chuyên trách nòng cốt bảo vệ an ninh mạng quốc gia.',
    time_limit: 15
  },
  {
    id: 'KD_12',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Chống gian lận mã OTP',
    question_text: 'Khi nhân viên tự xưng là tổng đài viên ngân hàng gọi điện yêu cầu đọc mã OTP để hoàn tất thủ tục hủy khoản vay lạ, sinh viên cần làm gì?',
    options: {
      A: 'Đọc ngay mã OTP để tránh bị trừ tiền',
      B: 'Tuyệt đối không cung cấp mã OTP cho bất kỳ ai, lập tức dập máy và gọi đến hotline chính thức của ngân hàng',
      C: 'Nhắn tin mã OTP qua Zalo cho người đó',
      D: 'Đọc nửa đầu mã OTP để thăm dò'
    },
    correct_key: 'B',
    explanation: 'Ngân hàng và các tổ chức tín dụng KHÔNG BAO GIỜ yêu cầu khách hàng cung cấp mã OTP dưới mọi hình thức. Chia sẻ OTP đồng nghĩa với việc trao quyền chuyển tiền cho kẻ gian.',
    time_limit: 15
  },
  {
    id: 'KD_13',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Kỹ thuật Social Engineering',
    question_text: 'Hình thức tấn công lừa đảo người dùng qua tin nhắn SMS chứa liên kết độc hại được gọi là gì?',
    options: {},
    correct_key: 'SMISHING',
    explanation: 'Smishing là từ ghép giữa SMS và Phishing (Lừa đảo qua tin nhắn ngắn SMS).',
    time_limit: 15
  },
  {
    id: 'KD_14',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Bản quyền & Trí tuệ nhân tạo',
    question_text: 'Theo khuyến nghị của UNESCO năm 2021 về Đạo đức AI, nguyên tắc nào quan trọng nhất khi sử dụng AI để sáng tạo nội dung học thuật?',
    options: {
      A: 'Minh bạch nguồn gốc dữ liệu và chịu trách nhiệm giải trình của con người',
      B: 'Che giấu việc sử dụng AI để đạt điểm tối đa',
      C: 'Để AI thay thế hoàn toàn tư duy phản biện',
      D: 'Bán quyền tác giả do AI tạo ra mà không kiểm chứng'
    },
    correct_key: 'A',
    explanation: 'UNESCO nhấn mạnh tính minh bạch, đạo đức và trách nhiệm giải trình của con người khi ứng dụng công nghệ AI vào giáo dục và sáng tạo nội dung.',
    time_limit: 15
  },
  {
    id: 'KD_15',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Lừa đảo việc làm trực tuyến',
    question_text: 'Chiêu trò "Làm nhiệm vụ xem video TikTok/Shopee kiếm tiền triệu mỗi ngày" kèm yêu cầu nạp tiền ký quỹ để nhận hoa hồng lớn hơn thực chất là mô hình lừa đảo nào?',
    options: {
      A: 'Mô hình kinh doanh tiếp thị liên kết chân chính',
      B: 'Bẫy lừa đảo nạp tiền làm nhiệm vụ theo mô hình Ponzi đa cấp trực tuyến',
      C: 'Chương trình tài trợ sinh viên khởi nghiệp',
      D: 'Hệ thống tuyển dụng chính thức của các sàn thương mại'
    },
    correct_key: 'B',
    explanation: 'Kẻ lừa đảo thả mồi hoa hồng nhỏ ban đầu, sau đó yêu cầu nạp số tiền ngày càng lớn vào các nhiệm vụ VIP rồi khóa tài khoản, chiếm đoạt toàn bộ tiền nạp.',
    time_limit: 15
  },
  {
    id: 'KD_16',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Kỹ thuật phân tích Deepfake',
    question_text: 'Tên thuật ngữ chỉ việc chèn âm thanh giả lập bằng giọng nói của người khác bằng AI là gì?',
    options: {},
    correct_key: 'VOICE CLONING',
    explanation: 'Voice Cloning (Nhân bản giọng nói) là công nghệ AI phân tích mẫu âm thanh ngắn để tái tạo giọng nói nhân tạo giống hệt nạn nhân.',
    time_limit: 15
  },
  {
    id: 'KD_17',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Bảo vệ dữ liệu cá nhân (NĐ 13/2023)',
    question_text: 'Theo Nghị định 13/2023/NĐ-CP, dữ liệu nào sau đây thuộc nhóm "Dữ liệu cá nhân nhạy cảm"?',
    options: {
      A: 'Họ và tên khai sinh',
      B: 'Dữ liệu về sinh trắc học (vân tay, khuôn mặt), tài khoản ngân hàng và tình trạng sức khỏe',
      C: 'Địa chỉ email công khai',
      D: 'Năm sinh'
    },
    correct_key: 'B',
    explanation: 'Nghị định 13/2023 phân loại dữ liệu sinh trắc học, dữ liệu tài chính ngân hàng, thông tin sức khỏe và xu hướng giới tính là Dữ liệu cá nhân nhạy cảm, đòi hỏi quy trình bảo vệ nghiêm ngặt nhất.',
    time_limit: 15
  },
  {
    id: 'KD_18',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Mạng xã hội & Quyền riêng tư',
    question_text: 'Thói quen "Check-in trực tiếp vé máy bay kèm mã vạch Barcode/QR" lên Facebook tiềm ẩn nguy cơ bảo mật gì?',
    options: {
      A: 'Kẻ gian có thể quét mã vạch để trích xuất thông tin mã đặt chỗ (PNR), họ tên, số hộ chiếu và thay đổi chuyến bay',
      B: 'Điện thoại bị tụt pin nhanh hơn',
      C: 'Tài khoản Facebook bị khóa do vi phạm bản quyền vé',
      D: 'Không có bất kỳ nguy cơ nào'
    },
    correct_key: 'A',
    explanation: 'Mã vạch trên thẻ lên máy bay chứa mã PNR và dữ liệu cá nhân. Kẻ xấu có thể truy cập hệ thống hãng bay để thay đổi ghế, hủy vé hoặc chiếm đoạt điểm thưởng dặm bay.',
    time_limit: 15
  },
  {
    id: 'KD_19',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Cổng thông tin Cảnh báo an toàn',
    question_text: 'Trang web chính thức của Cổng không gian mạng quốc gia Việt Nam để tra cứu và báo cáo lừa đảo là canhbao.khonggianmang..... (điền phần còn lại)?',
    options: {},
    correct_key: 'VN',
    explanation: 'Địa chỉ cổng thông tin cảnh báo an toàn mạng quốc gia là https://canhbao.khonggianmang.vn.',
    time_limit: 15
  },
  {
    id: 'KD_20',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Kỹ thuật tấn công lừa đảo',
    question_text: 'Kỹ thuật "Typosquatting" trong an toàn thông tin là gì?',
    options: {
      A: 'Đăng ký các tên miền gần giống tên miền nổi tiếng nhưng cố tình gõ sai một chữ cái (VD: gooogle.com)',
      B: 'Tấn công từ chối dịch vụ phân tán DDoS',
      C: 'Cài đặt mã độc đào tiền mã hóa ngầm',
      D: 'Quét vân tay giả'
    },
    correct_key: 'A',
    explanation: 'Typosquatting (URL Hijacking) lợi dụng lỗi gõ nhầm chính tả của người dùng để dẫn dắt nạn nhân vào các trang web giả mạo giao diện.',
    time_limit: 15
  },
  {
    id: 'KD_21',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Chống mã độc USB',
    question_text: 'Hành động an toàn nhất khi cắm USB lạ của người khác vào máy tính học tập của mình là gì?',
    options: {
      A: 'Mở trực tiếp các tệp tin có đuôi .exe để kiểm tra',
      B: 'Quét toàn bộ USB bằng phần mềm Antivirus có bản quyền và tắt tính năng AutoRun',
      C: 'Sao chép toàn bộ sang ổ cứng C rồi mới mở',
      D: 'Đổi tên các tệp tin trên USB'
    },
    correct_key: 'B',
    explanation: 'Tắt tính năng AutoRun ngăn mã độc tự thực thi, kết hợp quét Antivirus giúp phát hiện trojan và sâu máy tính ẩn trong USB.',
    time_limit: 15
  },
  {
    id: 'KD_22',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Mã hóa dữ liệu',
    question_text: 'Thuật ngữ chỉ việc mã hóa thông tin hai chiều giữa người gửi và người nhận mà máy chủ trung gian không thể đọc được là End-to-End ... (điền từ tiếng Anh)?',
    options: {},
    correct_key: 'ENCRYPTION',
    explanation: 'E2EE (End-to-End Encryption - Mã hóa đầu cuối) bảo vệ nội dung tin nhắn không bị giải mã bởi bất kỳ bên thứ ba hay máy chủ trung gian nào.',
    time_limit: 15
  },
  {
    id: 'KD_23',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Văn hóa số & Phòng chống bạo lực mạng',
    question_text: 'Khi phát hiện một người bạn bị công kích, vu khống trên mạng xã hội (Cyberbullying), thái độ đúng đắn của sinh viên là gì?',
    options: {
      A: 'Chia sẻ bài viết rộng rãi để tăng tương tác',
      B: 'Vào bình luận chửi bới người công kích bằng ngôn từ xúc phạm',
      C: 'Động viên nạn nhân, chụp ảnh lưu giữ bằng chứng vi phạm và báo cáo quản trị viên/cơ quan có thẩm quyền',
      D: 'Lập tài khoản ẩn danh để kích động tranh cãi'
    },
    correct_key: 'C',
    explanation: 'Thu thập bằng chứng số và báo cáo cơ quan chức năng giúp bảo vệ nạn nhân một cách hợp pháp, tránh biến mình thành người vi phạm pháp luật mạng.',
    time_limit: 15
  },
  {
    id: 'KD_24',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Cập nhật bản vá hệ điều hành',
    question_text: 'Tại sao các chuyên gia an ninh mạng luôn khuyến cáo bật cập nhật tự động (Auto Update) cho Windows/macOS/iOS/Android?',
    options: {
      A: 'Để tiêu thụ nhiều dung lượng ổ cứng hơn',
      B: 'Để vá kịp thời các lỗ hổng bảo mật Zero-Day mà hacker đang khai thác',
      C: 'Để làm chậm máy tính cũ',
      D: 'Để xóa các phần mềm không dùng đến'
    },
    correct_key: 'B',
    explanation: 'Các bản vá bảo mật (Security Patches) sửa các lỗ hổng nghiêm trọng đã được công bố, ngăn chặn mã độc tự động lây nhiễm qua mạng.',
    time_limit: 15
  },
  {
    id: 'KD_25',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Tấn công từ chối dịch vụ',
    question_text: 'Viết tắt của hình thức tấn công mạng làm nghẽn băng thông máy chủ bằng mạng máy tính ma (Botnet) là gì?',
    options: {},
    correct_key: 'DDOS',
    explanation: 'DDoS (Distributed Denial of Service) là tấn công từ chối dịch vụ phân tán làm sập hệ thống bằng lượng truy cập ảo khổng lồ.',
    time_limit: 15
  },
  {
    id: 'KD_26',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Ứng dụng OTT & Lừa đảo tin nhắn',
    question_text: 'Dấu hiệu nào cho thấy tài khoản Zalo/Facebook của người thân vừa bị kẻ xấu chiếm đoạt quyền điều khiển (Hack)?',
    options: {
      A: 'Đột ngột nhắn tin bằng giọng điệu lạ, hỏi vay tiền gấp và yêu cầu chuyển đến số tài khoản người khác không trùng tên',
      B: 'Đăng hình ảnh du lịch phong cảnh',
      C: 'Thả tim vào bài viết của bạn',
      D: 'Đổi ảnh đại diện cá nhân'
    },
    correct_key: 'A',
    explanation: 'Kẻ hack tài khoản thường tận dụng danh bạ có sẵn để nhắn tin khẩn cấp xin mượn tiền chuyển vào số tài khoản ngân hàng "rác".',
    time_limit: 15
  },
  {
    id: 'KD_27',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Quét mã QR độc hại',
    question_text: 'Hành vi kẻ gian dán đè mã QR lừa đảo lên mã QR thanh toán của cửa hàng hoặc trên bưu phẩm giả mạo gọi là gì?',
    options: {
      A: 'QR Phishing (Quishing)',
      B: 'Bluetooth Sniffing',
      C: 'Buffer Overflow',
      D: 'SQL Injection'
    },
    correct_key: 'A',
    explanation: 'Quishing là phương thức lừa đảo qua mã QR dẫn người dùng đến trang web độc hại hoặc tài khoản nhận tiền giả mạo.',
    time_limit: 15
  },
  {
    id: 'KD_28',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Phần mềm diệt virus',
    question_text: 'Chương trình bức tường lửa kiểm soát lưu lượng mạng vào và ra khỏi máy tính gọi là gì (Fire...)?',
    options: {},
    correct_key: 'FIREWALL',
    explanation: 'Firewall (Tường lửa) giám sát và lọc các luồng dữ liệu mạng dựa trên các quy tắc bảo mật được thiết lập.',
    time_limit: 15
  },
  {
    id: 'KD_29',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Trình duyệt Web & Cookie',
    question_text: 'Cookie phiên duyệt web (Session Cookie) chứa thông tin nhạy cảm nào cần được bảo vệ?',
    options: {
      A: 'Phiên đăng nhập đã xác thực của người dùng trên các dịch vụ web',
      B: 'Tên nhà sản xuất màn hình',
      C: 'Tốc độ quay của quạt tản nhiệt máy tính',
      D: 'Độ sáng bàn phím'
    },
    correct_key: 'A',
    explanation: 'Kẻ xấu đánh cắp Session Cookie (Session Hijacking) có thể đăng nhập vào tài khoản của nạn nhân mà không cần biết mật khẩu hay mã OTP.',
    time_limit: 15
  },
  {
    id: 'KD_30',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'An toàn email sinh viên',
    question_text: 'Tệp đính kèm nào trong email có nguy cơ chứa mã độc thực thi cao nhất?',
    options: {
      A: 'tailieu.pdf (Tệp PDF thuần văn bản)',
      B: 'bantin.txt (Tệp văn bản thô)',
      C: 'hopdong_hocbong.exe hoặc bangdiem.vbs',
      D: 'anhthucte.jpg'
    },
    correct_key: 'C',
    explanation: 'Các tệp có phần mở rộng thực thi (.exe, .vbs, .bat, .scr) có khả năng chạy lệnh mã độc ngay khi người dùng nhấp đúp chuột.',
    time_limit: 15
  },
  {
    id: 'KD_31',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Phần mềm gián điệp',
    question_text: 'Loại phần mềm độc hại bí mật ghi lại toàn bộ thao tác gõ phím của nạn nhân để lấy cắp mật khẩu gọi là gì?',
    options: {},
    correct_key: 'KEYLOGGER',
    explanation: 'Keylogger thu thập và ghi nhớ từng phím bấm bàn phím của người dùng rồi gửi về máy chủ của tin tặc.',
    time_limit: 15
  },
  {
    id: 'KD_32',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Bảo mật ứng dụng di động',
    question_text: 'Nguyên tắc vàng khi cài đặt ứng dụng mới trên điện thoại thông minh là gì?',
    options: {
      A: 'Chỉ cài đặt từ chợ ứng dụng chính thức (Google Play / App Store) và kiểm tra kỹ quyền truy cập ứng dụng yêu cầu',
      B: 'Tải file .APK không rõ nguồn gốc từ các trang web chia sẻ lậu',
      C: 'Cấp quyền truy cập Danh bạ, Micro, Vị trí cho tất cả ứng dụng',
      D: 'Bẻ khóa (Jailbreak / Root) thiết bị để cài ứng dụng lậu'
    },
    correct_key: 'A',
    explanation: 'Cài ứng dụng ngoài chợ chính thức hoặc cấp quyền bừa bãi là con đường phổ biến nhất khiến điện thoại bị cài mã độc chiếm quyền trợ năng.',
    time_limit: 15
  },
  {
    id: 'KD_33',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Nhận diện tin giả (Fake News)',
    question_text: 'Phương pháp kiểm chứng nhanh độ tin cậy của một thông tin giật gân trên mạng xã hội là gì?',
    options: {
      A: 'Đối chiếu với các cơ quan báo chí chính thống (TTXVN, VTV, Báo Nhân Dân...) và cổng thông tin cơ quan nhà nước',
      B: 'Tin ngay nếu bài viết có hàng ngàn lượt chia sẻ',
      C: 'Tin ngay nếu hình ảnh minh họa trông rất bắt mắt',
      D: 'Chia sẻ lại ngay lập tức để cảnh báo bạn bè'
    },
    correct_key: 'A',
    explanation: 'Thông tin chính thống luôn được kiểm duyệt và kiểm chứng nguồn tin theo Luật Báo chí, không chạy theo lượng tương tác câu view.',
    time_limit: 15
  },
  {
    id: 'KD_34',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Tiêu chuẩn Web',
    question_text: 'Biểu tượng chiếc ổ khóa trên thanh địa chỉ trình duyệt web biểu thị trang web đang sử dụng chứng chỉ bảo mật nào (SSL/...)?',
    options: {},
    correct_key: 'TLS',
    explanation: 'Chứng chỉ SSL/TLS (Transport Layer Security) mã hóa kết nối giữa trình duyệt của người dùng và máy chủ trang web.',
    time_limit: 15
  },
  {
    id: 'KD_35',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Văn hóa trích dẫn học thuật số',
    question_text: 'Hành vi sử dụng đoạn văn do ChatGPT viết và nộp vào bài tiểu luận mà không ghi chú nguồn trích dẫn vi phạm chuẩn mực nào?',
    options: {
      A: 'Vi phạm Liêm chính học thuật (Academic Integrity)',
      B: 'Vi phạm an toàn phần cứng máy tính',
      C: 'Vi phạm luật giao thông đường bộ',
      D: 'Không vi phạm vì AI là công cụ mở'
    },
    correct_key: 'A',
    explanation: 'Liêm chính học thuật yêu cầu người học phải minh bạch nguồn tài liệu và không nhận quyền tác giả đối với nội dung không do mình tự tư duy sáng tạo.',
    time_limit: 15
  },
  {
    id: 'KD_36',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Khai thác lỗ hổng con người (Social Engineering)',
    question_text: 'Thủ đoạn kẻ gian gọi điện giả danh công an thông báo tài khoản dính líu đến đường dây rửa tiền và yêu cầu chuyển tiền giám định khai thác tâm lý nào?',
    options: {
      A: 'Khai thác tâm lý hoảng loạn, sợ hãi trước uy quyền pháp luật và cô lập nạn nhân',
      B: 'Khai thác tính tò mò công nghệ',
      C: 'Khai thác lòng yêu thích thể thao',
      D: 'Khai thác nhu cầu mua sắm giảm giá'
    },
    correct_key: 'A',
    explanation: 'Đây là kịch bản tâm lý kinh điển gây áp lực thời gian và nỗi sợ bị bắt giữ để nạn nhân không kịp tham khảo ý kiến người thân.',
    time_limit: 15
  },
  {
    id: 'KD_37',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Ứng cứu sự cố máy tính',
    question_text: 'Phím tắt thông dụng để khóa màn hình máy tính Windows ngay lập tức khi rời khỏi bàn là Windows + ...?',
    options: {},
    correct_key: 'L',
    explanation: 'Tổ hợp phím Windows + L khóa ngay màn hình làm việc để ngăn người khác truy cập trái phép khi bạn tạm rời chỗ ngồi.',
    time_limit: 15
  },
  {
    id: 'KD_38',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Lừa đảo đầu tư tài chính ảo',
    question_text: 'Dấu hiệu nào khẳng định một sàn giao dịch tiền ảo/ngoại hối trên mạng là sàn lừa đảo?',
    options: {
      A: 'Cam kết lợi nhuận 100% không rủi ro, hoa hồng giới thiệu người mới cực cao và không cho rút tiền khi nạp nhiều',
      B: 'Có trụ sở đăng ký hợp pháp tại Việt Nam',
      C: 'Có cảnh báo rủi ro biến động giá rõ ràng',
      D: 'Không yêu cầu nạp tiền ký quỹ'
    },
    correct_key: 'A',
    explanation: 'Quy luật thị trường tài chính là lợi nhuận đi kèm rủi ro. Các sàn cam kết lãi suất phi thực tế và chặn lệnh rút tiền chắc chắn là bẫy lừa đảo.',
    time_limit: 15
  },
  {
    id: 'KD_39',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Trình quản lý mật khẩu',
    question_text: 'Ưu điểm lớn nhất của việc sử dụng phần mềm Quản lý Mật khẩu (Password Manager) là gì?',
    options: {
      A: 'Cho phép tạo và lưu trữ tự động các mật khẩu ngẫu nhiên phức tạp, duy nhất cho mỗi trang web',
      B: 'Tự động gửi mật khẩu cho bạn bè',
      C: 'Xóa bớt các tài khoản không dùng',
      D: 'Tăng tốc độ kết nối Internet'
    },
    correct_key: 'A',
    explanation: 'Password Manager giúp người dùng tránh thói quen nguy hiểm là dùng chung 1 mật khẩu đơn giản cho tất cả các dịch vụ mạng.',
    time_limit: 15
  },
  {
    id: 'KD_40',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Xác thực sinh trắc học',
    question_text: 'Phương thức xác thực khuôn mặt 3D trên các thiết bị Apple được gọi là Face ...?',
    options: {},
    correct_key: 'ID',
    explanation: 'Face ID là hệ thống nhận diện khuôn mặt sinh trắc học 3D của Apple sử dụng camera TrueDepth.',
    time_limit: 15
  },
  {
    id: 'KD_41',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Sao lưu dữ liệu (Backup)',
    question_text: 'Nguyên tắc sao lưu dữ liệu "3-2-1" kinh điển trong an toàn thông tin có nghĩa là gì?',
    options: {
      A: '3 bản sao dữ liệu, trên 2 loại phương tiện lưu trữ khác nhau, và 1 bản sao lưu ở một địa điểm vật lý khác (Off-site/Cloud)',
      B: 'Sao lưu 3 lần mỗi ngày, dùng 2 phần mềm, sau 1 năm xóa',
      C: 'Dành cho 3 người dùng, 2 máy tính, 1 ổ đĩa',
      D: 'Sao lưu trong 3 phút, nghỉ 2 phút, kiểm tra 1 phút'
    },
    correct_key: 'A',
    explanation: 'Quy tắc 3-2-1 là tiêu chuẩn phòng chống mất mát dữ liệu do thiên tai, hỏng hóc phần cứng hoặc bị mã độc Ransomware mã hóa.',
    time_limit: 15
  },
  {
    id: 'KD_42',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Tài khoản mạng & Mạo danh',
    question_text: 'Khi phát hiện tài khoản mạng xã hội mạo danh tên và hình ảnh của mình đi lừa đảo bạn bè, bước xử lý khẩn cấp đầu tiên là gì?',
    options: {
      A: 'Đăng thông báo công khai cảnh báo bạn bè trên tài khoản chính thức, đồng thời gửi báo cáo (Report Mạo danh) lên nền tảng và cơ quan chức năng',
      B: 'Im lặng và xóa tài khoản của mình',
      C: 'Chuyển tiền theo yêu cầu của kẻ mạo danh',
      D: 'Đổi tên tài khoản của mình sang tên khác'
    },
    correct_key: 'A',
    explanation: 'Thông báo kịp thời giúp người thân trong danh bạ không bị sập bẫy lừa vay tiền, kết hợp gửi báo cáo vi phạm để nền tảng khóa tài khoản mạo danh.',
    time_limit: 15
  },
  {
    id: 'KD_43',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'SHORT_ANSWER',
    category: 'Giao thức Bluetooth',
    question_text: 'Kỹ thuật hacker gửi tin nhắn rác hoặc mã độc không mời đến thiết bị mở Bluetooth gần đó gọi là Blue... (điền phần còn lại)?',
    options: {},
    correct_key: 'JACKING',
    explanation: 'Bluejacking là hành vi gửi các tin nhắn không mong muốn đến các thiết bị di động có bật Bluetooth trong phạm vi gần.',
    time_limit: 15
  },
  {
    id: 'KD_44',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Quyền riêng tư vị trí (GPS)',
    question_text: 'Tại sao nên tắt quyền truy cập vị trí định vị liên tục (Always Allow) của các ứng dụng không cần thiết (đèn pin, máy tính, chỉnh ảnh)?',
    options: {
      A: 'Ngăn chặn nhà phát triển theo dõi lịch trình di chuyển và bảo vệ quyền riêng tư cá nhân',
      B: 'Làm tăng dung lượng bộ nhớ RAM',
      C: 'Tắt sóng điện thoại',
      D: 'Làm điện thoại hiển thị nhiều quảng cáo hơn'
    },
    correct_key: 'A',
    explanation: 'Dữ liệu vị trí theo thời gian thực là thông tin nhạy cảm. Ứng dụng độc hại có thể dựng lại toàn bộ thói quen, địa chỉ nhà và nơi học tập của bạn.',
    time_limit: 15
  },
  {
    id: 'KD_45',
    round_name: 'Vòng 1: Khởi động',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Văn hóa phản biện số',
    question_text: 'Trước khi bấm nút "Chia sẻ" (Share) một thông tin trên mạng xã hội, câu hỏi tư duy phản biện nào cần đặt ra đầu tiên?',
    options: {
      A: 'Thông tin này bắt nguồn từ nguồn tin chính thống nào? Đã được kiểm chứng chưa hay chỉ là tin đồn giật gân?',
      B: 'Bài viết này có giúp mình được nhiều lượt like không?',
      C: 'Người đăng bài có nhiều người theo dõi không?',
      D: 'Hình ảnh có gây sốc không?'
    },
    correct_key: 'A',
    explanation: 'Tư duy phản biện số (Digital Critical Thinking) giúp ngăn chặn việc vô tình trở thành mắt xích phát tán tin giả và vi phạm Luật An ninh mạng.',
    time_limit: 15
  },

  // =========================================================================
  // PHẦN 2: VƯỢT CHƯỚNG NGẠI VẬT (VCNV_01)
  // =========================================================================
  {
    id: 'VCNV_01',
    round_name: 'Vòng 2: Vượt Chướng Ngại Vật',
    round_type: 'VCNV',
    category: 'Quan sát & Giải mã từ khóa CNV',
    question_text: 'Thí sinh và khán giả cùng quan sát các hàng ngang gợi ý để giải mã Từ khóa Chướng Ngại Vật bí mật.',
    options: {},
    correct_key: 'DEEPFAKE',
    explanation: 'Từ khóa Chướng Ngại Vật chính thức của chương trình. Khán giả nhanh tay gửi dự đoán để nhận điểm vinh danh.',
    time_limit: 60
  },

  // =========================================================================
  // PHẦN 3: 4 CÂU TĂNG TỐC (TT_01 -> TT_04)
  // Hỗ trợ Trả lời ngắn & Trắc nghiệm 6 phương án loại trừ ngẫu nhiên 2 phương án mỗi 10s
  // =========================================================================
  {
    id: 'TT_01',
    round_name: 'Vòng 3: Tăng tốc',
    round_type: 'SEQUENCING',
    category: 'Quy trình Xử lý Sự cố An toàn Thông tin (Incident Response)',
    question_text: 'Hãy sắp xếp đúng thứ tự 4 bước khẩn cấp khi phát hiện thiết bị cá nhân bị nhiễm mã độc mã hóa dữ liệu (Ransomware): [A] Ngắt kết nối mạng ngay lập tức | [B] Báo cáo quản trị hệ thống/SOC | [C] Sao lưu bằng chứng nhật ký log | [D] Quét và cô lập tiến trình độc hại.',
    options: {
      A: 'A -> B -> D -> C',
      B: 'A -> D -> C -> B',
      C: 'B -> A -> D -> C',
      D: 'D -> A -> B -> C'
    },
    correct_key: 'A',
    explanation: 'Quy trình chuẩn NIST SP 800-61: Bước 1 (Ngắt mạng) để ngăn lây lan sang các máy chủ khác trong mạng LAN -> Bước 2 (Báo cáo SOC) để kích hoạt phản ứng tổng thể -> Bước 3 (Quét cô lập) -> Bước 4 (Lưu vết log phục vụ điều tra forensic).',
    time_limit: 20
  },
  {
    id: 'TT_02',
    round_name: 'Vòng 3: Tăng tốc (Loại trừ)',
    round_type: 'ELIMINATION_6',
    category: 'Kỹ năng số: Chọn lọc giải pháp bảo mật tài khoản',
    question_text: 'Trong 6 phương án sau đây, đâu là những giải pháp bảo vệ tài khoản số KHÔNG NÊN áp dụng? (Hệ thống sẽ tự động/Admin loại trừ ngẫu nhiên 2 phương án mỗi 10 giây):',
    options: {
      A: 'Đặt mật khẩu dài kết hợp ký tự đặc biệt',
      B: 'Sử dụng chung một mật khẩu cho mọi mạng xã hội và email',
      C: 'Bật xác thực đa yếu tố (2FA) qua ứng dụng Authenticator',
      D: 'Lưu trữ mật khẩu dạng file word không khóa trên Desktop',
      E: 'Sử dụng khóa bảo mật phần cứng FIDO2 / YubiKey',
      F: 'Tắt tính năng cập nhật bảo mật tự động của hệ điều hành'
    },
    correct_key: 'B',
    explanation: 'Các thói quen mất an toàn nghiêm trọng: B (Dùng chung mật khẩu tạo hiệu ứng domino khi 1 bên bị lộ), D (Lưu text file thô), F (Không cập nhật bản vá lỗ hổng zero-day).',
    time_limit: 20
  },
  {
    id: 'TT_03',
    round_name: 'Vòng 3: Tăng tốc (Loại trừ)',
    round_type: 'ELIMINATION_6',
    category: 'Nhận diện các hình thức Lừa đảo trên mạng xã hội',
    question_text: 'Trong 6 dấu hiệu dưới đây, đâu là dấu hiệu ĐIỂN HÌNH NHẤT của một cuộc gọi Deepfake Voice mạo danh vay tiền gấp?',
    options: {
      A: 'Âm thanh có đoạn ngắt quãng cơ học, giọng nói đều đều thiếu cảm xúc tự nhiên',
      B: 'Người gọi chủ động bảo bạn gặp mặt trực tiếp để nhận tiền mặt',
      C: 'Tài khoản yêu cầu chuyển tiền là số tài khoản của chính mẹ ruột bạn',
      D: 'Người gọi yêu cầu xác nhận danh tính qua cơ quan công an',
      E: 'Giọng nói có lẫn tiếng thở tự nhiên và gọi đúng biệt danh bí mật thời thơ ấu',
      F: 'Cuộc gọi kéo dài trên 30 phút với nhiều chi tiết đời thường chính xác'
    },
    correct_key: 'A',
    explanation: 'Deepfake Audio thường có hiện tượng flat intonation (thiếu ngữ điệu cảm xúc tự nhiên), tiếng kim loại ngắt quãng và không trả lời được các câu hỏi kiểm chứng bất ngờ.',
    time_limit: 30
  },
  {
    id: 'TT_04',
    round_name: 'Vòng 3: Tăng tốc',
    round_type: 'SHORT_ANSWER',
    category: 'Xác thực & Mã hóa khóa công khai',
    question_text: 'Giao thức bảo mật phần cứng không dùng mật khẩu chuẩn quốc tế do FIDO Alliance phát triển viết tắt là gì (FIDO...)?',
    options: {},
    correct_key: 'FIDO2',
    explanation: 'FIDO2 là chuẩn xác thực mạnh không dùng mật khẩu (Passkey/Security Key), chống lại hoàn toàn các cuộc tấn công Phishing và chiếm đoạt OTP.',
    time_limit: 30
  },

  // =========================================================================
  // PHẦN 4: VỀ ĐÍCH (CÂU HỎI TỰ DO: TRẮC NGHIỆM 4 PHƯƠNG ÁN & ĐÚNG SAI 4 Ý)
  // Thời gian: 5 - 15 - 20 - 30 (Thực hành Về đích: 30 - 60 - 90s)
  // =========================================================================
  {
    id: 'VD_01',
    round_name: 'Vòng 4: Về đích',
    round_type: 'TRUE_FALSE_4',
    category: 'Pháp luật & Tình huống Lừa đảo mạng (Đúng / Sai 4 ý)',
    question_text: 'Chị T lập một tài khoản trên mạng xã hội để bán túi xách. Nhận thấy chị K có nhu cầu mua hàng để bán, chị T đã nhắn tin cho chị K chào hàng với giá rẻ. Đồng thời, chị T tự ý sử dụng điện thoại của anh H và dùng tài khoản mạng xã hội của anh nhắn tin cho chị K để giả vờ đặt mua hàng với số lượng lớn. Chị K thấy đơn hàng có lợi nhuận cao nên đã chuyển 70 triệu đồng tiền cọc mua túi xách cho chị T. Sau khi nhận tiền của chị K, chị T không giao hàng cho chị K như đã thỏa thuận mà chặn tài khoản, cắt đứt liên lạc. Phát hiện bị lừa, chị K đã đến cơ quan có thẩm quyền để trình báo sự việc. Sau đó, cơ quan có thẩm quyền đã khởi tố vụ án, khởi tố bị can.',
    options: {
      a: 'Việc chị T lựa chọn mặt hàng túi xách để bán là thực hiện quyền của công dân trong kinh doanh.',
      b: 'Chị T không vi phạm quyền được bảo đảm an toàn và bí mật thư tín, điện thoại, điện tín của anh H.',
      c: 'Chị T không phải chịu trách nhiệm hình sự.',
      d: 'Hành vi của chị T vi phạm quyền sở hữu tài sản của công dân.'
    },
    correct_key: 'a:Đ,b:S,c:S,d:Đ',
    explanation: 'Căn cứ pháp luật: Ý a) ĐÚNG vì công dân có quyền tự do kinh doanh mặt hàng pháp luật không cấm. Ý b) SAI vì chị T tự ý sử dụng điện thoại và tài khoản anh H xâm phạm bí mật đời tư, thư tín. Ý c) SAI vì hành vi lừa đảo chiếm đoạt 70 triệu đồng đủ yếu tố cấu thành Tội Lừa đảo chiếm đoạt tài sản (Điều 174 BLHS). Ý d) ĐÚNG vì hành vi chiếm đoạt 70 triệu đồng xâm phạm quyền sở hữu tài sản hợp pháp của chị K.',
    time_limit: 60
  },
  {
    id: 'VD_02',
    round_name: 'Vòng 4: Về đích',
    round_type: 'TRUE_FALSE_4',
    category: 'Đạo đức AI & Bản quyền tác phẩm sinh thành (Đúng / Sai 4 ý)',
    question_text: 'Nhóm sinh viên A sử dụng mô hình Generative AI để tạo một bộ ảnh poster thương mại quảng bá sản phẩm tham dự cuộc thi quốc tế. Trong quá trình huấn luyện prompt, nhóm A đã tải toàn bộ tranh vẽ có bản quyền của họa sĩ B mà không xin phép, tạo ra các hình ảnh mang phong cách vẽ đặc trưng của họa sĩ B (Style Mimicry). Họa sĩ B phát hiện và gửi đơn khiếu nại vi phạm bản quyền và đạo đức AI.',
    options: {
      a: 'Nhóm sinh viên A sở hữu 100% bản quyền tác giả đối với phong cách nghệ thuật được AI tái tạo.',
      b: 'Việc tự ý cào dữ liệu (Scraping) tác phẩm có bản quyền để huấn luyện mô hình thương mại vi phạm nguyên tắc đạo đức AI của UNESCO.',
      c: 'Họa sĩ B không có quyền yêu cầu ban tổ chức gỡ bỏ tác phẩm nếu nhóm A đã công bố công khai prompt tạo ảnh.',
      d: 'Tính minh bạch nguồn dữ liệu (Data Provenance) là yêu cầu bắt buộc trong các quy định quản trị AI hiện đại.'
    },
    correct_key: 'a:S,b:Đ,c:S,d:Đ',
    explanation: 'Căn cứ Luật Sở hữu trí tuệ & Chuẩn UNESCO 2021: Ý a) SAI vì phong cách không thể tự động gán quyền độc quyền khi chưa có sự đồng thuận nguồn phái sinh. Ý b) ĐÚNG vì vi phạm liêm chính dữ liệu. Ý c) SAI vì chủ thể tác phẩm gốc có quyền bảo vệ quyền nhân thân và tài sản. Ý d) ĐÚNG vì minh bạch chuỗi nguồn là cốt lõi đạo đức AI.',
    time_limit: 60
  },
  {
    id: 'VD_03',
    round_name: 'Vòng 4: Về đích',
    round_type: 'TRUE_FALSE_4',
    category: 'Trách nhiệm thông tin cứu nạn khẩn cấp & Tin giả (Đúng / Sai 4 ý)',
    question_text: 'Trong một đợt bão lũ nghiêm trọng, tài khoản cá nhân X đăng tải bài viết kêu gọi cứu trợ khẩn cấp kèm hình ảnh một gia đình bị cô lập trên mái nhà và cung cấp mã QR tài khoản cá nhân nhận tiền từ thiện. Bạn là quản trị viên một diễn đàn sinh viên 50.000 thành viên và nhận được yêu cầu duyệt bài này ngay lập tức.',
    options: {
      a: 'Quản trị viên nên duyệt bài ngay lập tức mà không cần kiểm chứng vì tính chất nguy cấp cứu người.',
      b: 'Kẻ gian thường lợi dụng tâm lý lòng trắc ẩn trong khủng hoảng (Compassion Exploitation) để lừa đảo tiền từ thiện qua mã QR cá nhân.',
      c: 'Trách nhiệm của quản trị viên là hướng dẫn thành viên ủng hộ qua các đầu mối cứu trợ chính thống (Mặt trận Tổ quốc, Hội Chữ thập đỏ).',
      d: 'Hành vi phát tán thông tin sai sự thật về cứu trợ thiên tai có thể bị xử phạt vi phạm hành chính hoặc truy cứu trách nhiệm hình sự.'
    },
    correct_key: 'a:S,b:Đ,c:Đ,d:Đ',
    explanation: 'Ý a) SAI vì duyệt tin giả sẽ làm phân tán nguồn lực cứu trợ thực tế. Ý b) ĐÚNG vì đây là thủ đoạn trục lợi phổ biến. Ý c) ĐÚNG vì đảm bảo tiền cứu trợ đến đúng đồng bào. Ý d) ĐÚNG theo Nghị định 15/2020/NĐ-CP và Bộ luật Hình sự 2015.',
    time_limit: 60
  },
  {
    id: 'VD_04',
    round_name: 'Vòng 4: Về đích',
    round_type: 'MULTIPLE_CHOICE',
    category: 'Thực hành Về đích: Phản ứng trước tấn công Phishing',
    question_text: 'Tình huống thực hành: Bạn vừa lỡ nhập thông tin tài khoản ngân hàng và mã OTP vào một trang web giả mạo do nhấp link lạ trong tin nhắn SMS. Ba hành động xử lý khẩn cấp tối ưu nhất trong 60 giây đầu tiên là gì?',
    options: {
      A: '1. Gọi ngay hotline ngân hàng khóa tài khoản/thẻ | 2. Đổi mật khẩu ngân hàng điện tử từ thiết bị an toàn khác | 3. Trình báo cơ quan công an',
      B: '1. Tắt nguồn điện thoại và đợi ngày hôm sau | 2. Xóa tin nhắn SMS | 3. Đi ngủ',
      C: '1. Đăng bài lên Facebook hỏi ý kiến bạn bè | 2. Nhắn tin chửi kẻ lừa đảo | 3. Rút dây mạng',
      D: '1. Nạp thêm tiền vào tài khoản để kiểm tra | 2. Nhập lại OTP lần 2 | 3. Chia sẻ link cho bạn bè'
    },
    correct_key: 'A',
    explanation: 'Thời gian vàng 60s: Khóa thẻ khẩn cấp qua hotline hoặc app để chặn lệnh chuyển tiền tự động, sau đó đổi mật khẩu và lưu vết bằng chứng phục vụ phong tỏa tài khoản lừa đảo.',
    time_limit: 60
  },
  {
    id: 'VD_05',
    round_name: 'Vòng 4: Về đích - Kịch tình huống AID',
    round_type: 'BLIND_POLL',
    category: 'Kịch AID: Quyết định đạo đức trên không gian số',
    question_text: 'Tình huống kịch AID: Nhóm bạn phát hiện người quen bị quay lén và đe dọa tống tiền bằng hình ảnh nhạy cảm đã chỉnh sửa AI. Khán giả bình chọn giải pháp hỗ trợ nạn nhân toàn diện nhất:',
    blind_prompt: 'Kịch bản AID đang diễn ra trên sân khấu. Hãy lựa chọn giải pháp tối ưu cho tình huống:',
    options: {
      A: 'Phương án A: Khuyên nạn nhân trả tiền một lần để kẻ xấu xóa ảnh',
      B: 'Phương án B: Đồng hành tâm lý, lưu giữ chứng cứ số nguyên vẹn và liên hệ đường dây nóng bảo vệ trẻ em/phụ nữ & cơ quan công an',
      C: 'Phương án C: Tự ý đăng toàn bộ thông tin kẻ tống tiền lên mạng để trả đũa',
      D: 'Phương án D: Khuyên nạn nhân xóa tài khoản và im lặng chấp nhận'
    },
    correct_key: 'B',
    explanation: 'Không bao giờ thỏa hiệp trả tiền vì kẻ tống tiền sẽ tiếp tục đòi thêm. Lưu bằng chứng số và tìm kiếm sự can thiệp từ cơ quan bảo vệ pháp luật là giải pháp an toàn duy nhất.',
    time_limit: 30
  }
];
