/**
 * Dữ liệu Chính sách Pháp lý Chuẩn hóa - Beyond The Internet 2027 (BTI 2027)
 * Xây dựng trên cơ sở chuẩn hóa từ Bộ quy chế pháp lý VTVgo kết hợp quy chuẩn vận hành Đấu trường Học thuật Thời gian thực,
 * tuân thủ Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, Nghị định số 356/2025/NĐ-CP và Luật An ninh mạng số 116/2025/QH15.
 */

export interface PolicySection {
  id: string;
  title: string;
  content: string[];
  subsections?: {
    subtitle: string;
    items: string[];
  }[];
}

export interface PolicyDocument {
  id: 'TERMS' | 'PRIVACY' | 'DATA';
  nameVi: string;
  nameEn: string;
  shortDescriptionVi: string;
  shortDescriptionEn: string;
  sections: PolicySection[];
}

/**
 * 1. ĐIỀU KHOẢN SỬ DỤNG (TERMS OF SERVICE) - 8 ĐIỀU
 */
export const TERMS_OF_SERVICE_DATA: PolicyDocument = {
  id: 'TERMS',
  nameVi: 'Điều khoản sử dụng',
  nameEn: 'Terms of Service',
  shortDescriptionVi: 'Quy định quyền, nghĩa vụ và cam kết pháp lý khi tham gia đấu trường Beyond The Internet 2027.',
  shortDescriptionEn: 'Terms and legal obligations governing participation in the Beyond The Internet 2027 arena.',
  sections: [
    {
      id: 'terms-sec-1',
      title: '1. Đăng Ký Tài Khoản & Tư Cách Người Tham Gia',
      content: [
        'Để sử dụng ứng dụng và tham gia đấu trường Beyond The Internet 2027 (BTI 2027), Người dùng phải thực hiện đăng ký tài khoản thông qua giao diện chính thức hoặc nền tảng được BTI 2027 công nhận, đồng thời cung cấp đầy đủ, chính xác các thông tin cần thiết phục vụ định danh thi đấu.',
        'Người dùng có trách nhiệm cập nhật và bảo đảm tính trung thực, đầy đủ, chính xác của mọi thông tin cá nhân (Họ tên, Mã sinh viên/Học sinh, Đơn vị, Email, Số điện thoại) đã đăng ký.',
        'Về độ tuổi: Để tự mình đăng ký và chịu trách nhiệm pháp lý độc lập, Người dùng phải từ đủ 18 tuổi trở lên và có đầy đủ năng lực hành vi dân sự theo quy định của pháp luật Việt Nam. Trẻ em và người chưa thành niên (dưới 18 tuổi) chỉ được phép sử dụng ứng dụng khi có sự đồng ý và giám sát trực tiếp từ cha mẹ hoặc người giám hộ hợp pháp. Bằng việc đăng ký tài khoản, Người dùng xác nhận đã đáp ứng đầy đủ điều kiện về độ tuổi và năng lực hành vi dân sự.',
        'Ban Tổ chức BTI 2027 có toàn quyền yêu cầu Người dùng cung cấp giấy tờ, bằng chứng hợp lệ để chứng minh độ tuổi, thẻ học sinh/sinh viên hoặc thông tin xác thực danh tính khi cần xét duyệt tư cách hoặc trao giải thưởng.',
        'Người dùng có nghĩa vụ bảo mật thông tin tài khoản, mật khẩu và thiết bị truy cập. BTI 2027 không chịu trách nhiệm về bất kỳ thiệt hại hoặc kết quả thi đấu bất lợi nào phát sinh do Người dùng để lộ thông tin hoặc cho bên thứ ba mượn tài khoản. BTI 2027 có quyền tạm khóa hoặc chấm dứt quyền sử dụng tài khoản nhằm bảo vệ tính công bằng của đấu trường hoặc ngăn chặn các hành vi vi phạm pháp luật.'
      ]
    },
    {
      id: 'terms-sec-2',
      title: '2. Quyền Và Nghĩa Vụ Của Khách Hàng / Thí Sinh',
      content: [
        'Bằng việc đồng ý đăng ký tài khoản trên BTI 2027, Người dùng xác nhận đã đọc, hiểu rõ và cam kết tuân thủ toàn diện các điều khoản, quy chế thi đấu và quy định kỹ thuật của hệ thống.',
        'Sau khi đăng ký thành công, Người dùng được quyền truy cập các tính năng thi đấu tương tác trực tiếp, theo dõi bảng xếp hạng LED, gửi tiếng hô cổ vũ, đặt câu hỏi cho Ban Tổ chức và sử dụng trợ lý hỗ trợ theo quy định.',
        'Người dùng cam kết sử dụng ứng dụng cho mục đích học thuật, giao lưu trí tuệ và phi thương mại. Người dùng được cấp quyền truy cập không độc quyền và không được phép cấp lại, chuyển nhượng tài khoản thi đấu cho bất kỳ ai dưới bất kỳ hình thức nào.',
        'Cam kết không can thiệp kỹ thuật: Người dùng cam kết không dịch ngược, đảo ngược, tháo rời mã nguồn phần mềm; không chèn mã độc, bot tự động, script can thiệp luồng WebSocket hoặc độ trễ thi đấu; không thực hiện tấn công từ chối dịch vụ (DoS/DDoS) hoặc làm gián đoạn hạ tầng máy chủ đấu trường.',
        'Cam kết liêm chính học thuật: Tuyệt đối không gian lận đề thi, không sử dụng thiết bị phụ trợ bị cấm, không chia sẻ câu hỏi hoặc đáp án trái phép trong thời gian trận đấu đang diễn ra.',
        'Chất lượng kết nối: Người dùng hiểu và đồng ý rằng trải nghiệm tương tác thời gian thực phụ thuộc vào đường truyền mạng Internet, độ trễ mạng viễn thông và cấu hình thiết bị cá nhân. BTI 2027 luôn nỗ lực tối ưu hạ tầng nhưng không chịu trách nhiệm đối với lỗi rớt mạng hoặc mất kết nối xuất phát từ thiết bị hoặc đường truyền của Người dùng.'
      ]
    },
    {
      id: 'terms-sec-3',
      title: '3. Quyền Và Nghĩa Vụ Của Ban Tổ Chức (BTI 2027)',
      content: [
        'Quyền chủ động điều hành: Ban Tổ chức có quyền chủ động xây dựng, lựa chọn bộ câu hỏi, cơ chế tính điểm, thời lượng từng vòng thi đấu (Khởi Động, VCNV, Tăng Tốc, Về Đích) phù hợp với quy chế giải đấu và pháp luật hiện hành.',
        'Quyền cập nhật hệ thống: BTI 2027 có quyền nâng cấp tính năng, điều chỉnh giao diện, tối ưu thuật toán đồng bộ thời gian NTP và cập nhật chính sách mà không cần báo trước, nhằm nâng cao chất lượng trải nghiệm và tính bảo mật.',
        'Quyền xử lý vi phạm: Trường hợp Người dùng vi phạm Quy chế thi đấu hoặc có dấu hiệu gian lận kỹ thuật, Ban Tổ chức có toàn quyền hủy kết quả thi đấu, khóa vĩnh viễn tài khoản mà không cần báo trước và không có nghĩa vụ bồi hoàn.',
        'Bảo mật dữ liệu: BTI 2027 có trách nhiệm bảo mật thông tin cá nhân của Người dùng theo quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân; tuyệt đối không bán, trao đổi dữ liệu cá nhân cho bên thứ ba vì mục đích thương mại trái phép.',
        'Giải quyết khiếu nại: Tiếp nhận, xem xét và giải quyết khiếu nại liên quan đến kết quả thi đấu hoặc lỗi kỹ thuật trong thời hạn quy định. Quyết định cuối cùng của Hội đồng Giám khảo và Ban Tổ chức BTI 2027 có giá trị thi hành cao nhất.'
      ]
    },
    {
      id: 'terms-sec-4',
      title: '4. Sự Kiện Bất Khả Kháng',
      content: [
        'Sự kiện Bất Khả Kháng được hiểu là các sự kiện xảy ra ngoài khả năng kiểm soát hợp lý của các bên, không thể lường trước và không thể khắc phục được dù đã áp dụng mọi biện pháp cần thiết, bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, lũ lụt, động đất, dịch bệnh, chiến tranh, sự cố cáp quang biển diện rộng, mất điện lưới khu vực tổ chức thi đấu, hỏng hóc vệ tinh hoặc lỗi hạ tầng viễn thông quốc gia.',
        'Khi xảy ra Sự kiện Bất Khả Kháng khiến trận đấu bị gián đoạn, Ban Tổ chức BTI 2027 cam kết nỗ lực tối đa để bảo lưu dữ liệu điểm số đã thi đấu an toàn và thông báo phương án hoãn, thi đấu lại hoặc phân định kết quả công bằng tới toàn thể thí sinh.'
      ]
    },
    {
      id: 'terms-sec-5',
      title: '5. Quyền Sở Hữu Trí Tuệ',
      content: [
        'Toàn bộ nội dung hiển thị trên BTI 2027 bao gồm: ngân hàng câu hỏi, đáp án, tài liệu học thuật, hình ảnh nhận diện, video, logo BTI 2027, âm thanh hiệu ứng (SFX/BGM) và toàn bộ mã nguồn phần mềm đều thuộc quyền sở hữu trí tuệ độc quyền của Ban Tổ chức BTI 2027 hoặc các đơn vị đối tác hợp pháp được bảo hộ theo Luật Sở hữu trí tuệ Việt Nam.',
        'Nghiêm cấm sao chép, trích xuất, phát tán, ghi hình thương mại hoặc kinh doanh trái phép bộ đề thi và nội dung độc quyền của giải đấu dưới mọi hình thức khi chưa có văn bản đồng ý chính thức từ Ban Tổ chức.'
      ]
    },
    {
      id: 'terms-sec-6',
      title: '6. Các Quy Định Vận Hành Khác',
      content: [
        'Thiết bị và nền tảng hỗ trợ: Ứng dụng BTI 2027 được thiết kế tối ưu trên các trình duyệt web hiện đại (Chrome, Safari, Edge, Firefox) trên máy tính, máy tính bảng và điện thoại thông minh. Thiết bị đã bẻ khóa (root, jailbreak) hoặc can thiệp hệ điều hành có thể bị hạn chế tính năng bảo mật.',
        'Giới hạn tài khoản và kết nối: Mỗi thí sinh tham gia chỉ được đăng nhập đồng thời trên 01 (một) thiết bị thi đấu duy nhất trong suốt thời gian diễn ra vòng đấu để đảm bảo tính minh bạch và tránh gian lận chuyển giao tài khoản.',
        'Cơ chế giải thưởng & Vinh danh: Điểm số hiển thị trên Bảng xếp hạng trực tiếp là căn cứ xét giải sau khi đã hoàn tất quy trình đối soát dữ liệu và kiểm tra liêm chính học thuật.',
        'Giới hạn trách nhiệm: Trong phạm vi pháp luật cho phép, Ban Tổ chức không chịu trách nhiệm đối với các thiệt hại gián tiếp phát sinh từ việc sử dụng ứng dụng do lỗi phần cứng cá nhân của Người dùng.'
      ]
    },
    {
      id: 'terms-sec-7',
      title: '7. Các Quy Định Chung',
      content: [
        'Các điều khoản trong Quy chế này được giải thích và điều chỉnh độc quyền theo quy định của pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.',
        'Nếu bất kỳ điều khoản nào bị cơ quan tài phán có thẩm quyền tuyên bố vô hiệu hoặc không thể thi hành, các điều khoản còn lại vẫn giữ nguyên giá trị pháp lý.',
        'Mọi thông tin liên lạc, thông báo chính thức giữa Ban Tổ chức và Người dùng được thực hiện thông qua hình thức thông điệp dữ liệu điện tử (hệ thống thông báo trên ứng dụng, email hoặc kênh phát thanh Announcer trực tiếp).'
      ]
    },
    {
      id: 'terms-sec-8',
      title: '8. Thỏa Thuận Điện Tử Tham Gia Đấu Trường',
      content: [
        'Bằng việc chủ động tích chọn vào ô Checkbox xác nhận và bấm nút “Đồng ý & tiếp tục”, Người dùng xác nhận Thỏa thuận điện tử này có đầy đủ giá trị pháp lý ràng buộc như một hợp đồng văn bản ký kết theo Luật Giao dịch điện tử số 20/2023/QH15.',
        'Người dùng có thể tra cứu lại toàn văn điều khoản bất kỳ lúc nào tại chân trang ứng dụng hoặc mục Cài đặt & Pháp lý trong Hồ sơ cá nhân.'
      ]
    }
  ]
};

/**
 * 2. CHÍNH SÁCH BẢO MẬT (PRIVACY POLICY) - 10 ĐIỀU
 */
export const PRIVACY_POLICY_DATA: PolicyDocument = {
  id: 'PRIVACY',
  nameVi: 'Chính sách bảo mật',
  nameEn: 'Privacy Policy',
  shortDescriptionVi: 'Cam kết bảo vệ quyền riêng tư, an toàn thông tin và dữ liệu cá nhân theo Luật Bảo vệ dữ liệu cá nhân.',
  shortDescriptionEn: 'Commitment to data privacy and personal data protection under Vietnamese laws.',
  sections: [
    {
      id: 'privacy-sec-1',
      title: '1. Thu Thập Và Xử Lý Thông Tin Người Dùng',
      content: [
        'Bằng việc sử dụng nền tảng BTI 2027, Người dùng đồng ý cho phép BTI 2027 thu thập và xử lý các thông tin phát sinh trong quá trình đăng ký, truy cập và thi đấu tương tác.',
        'Các thông tin thu thập bao gồm: Họ tên, số điện thoại, địa chỉ email, tên đăng nhập, ảnh đại diện (avatar), trường lớp/đơn vị, mã sinh viên, thông tin thiết bị, địa chỉ IP, nhật ký kỹ thuật, thời gian phản hồi câu hỏi và dữ liệu tương tác trong trận đấu.',
        'Đối với tính năng tương tác trực tiếp (gửi câu hỏi Q&A, tiếng hô cổ vũ Shout-out), hệ thống thu thập nội dung tin nhắn, thời điểm gửi và tài khoản thực hiện để tiến hành kiểm duyệt bảo đảm an toàn thông tin theo chuẩn mực văn hóa học đường.',
        'Toàn bộ hoạt động thu thập, xử lý dữ liệu được tiến hành nghiêm ngặt theo quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân.'
      ]
    },
    {
      id: 'privacy-sec-2',
      title: '2. Mục Đích Thu Thập Và Xử Lý Thông Tin',
      content: [
        'Cung cấp và vận hành nền tảng đấu trường học thuật tương tác thời gian thực BTI 2027;',
        'Xác thực danh tính thí sinh, quản lý tài khoản và hỗ trợ kỹ thuật nhanh chóng khi gặp sự cố;',
        'Tính toán điểm số, xếp hạng trực tiếp trên màn chiếu LED sân khấu và trao chứng nhận/giải thưởng;',
        'Kiểm duyệt tự động, phát hiện và ngăn chặn các hành vi gian lận thi đấu, phát ngôn thiếu chuẩn mực hoặc vi phạm pháp luật;',
        'Bảo đảm an ninh mạng, phòng ngừa tấn công phá hoại và duy trì sự ổn định tuyệt đối của hệ thống;',
        'Thực hiện các nghĩa vụ báo cáo, lưu trữ theo quy định của cơ quan nhà nước có thẩm quyền.'
      ]
    },
    {
      id: 'privacy-sec-3',
      title: '3. Chia Sẻ Thông Tin Và Dữ Liệu Cá Nhân',
      content: [
        'BTI 2027 cam kết không bán, không chuyển giao thông tin cá nhân của Người dùng cho bên thứ ba vì mục đích thương mại trái phép.',
        'Thông tin chỉ được chia sẻ trong các trường hợp cần thiết sau:',
        '• Ban Tổ chức, Hội đồng Giám khảo và các đơn vị đồng tổ chức trực thuộc giải đấu để phục vụ công tác chấm thi và vinh danh;',
        '• Đơn vị cung cấp dịch vụ hạ tầng đám mây uy tín (Google Cloud, Google Firebase) có cam kết tuân thủ tiêu chuẩn an toàn thông tin quốc tế ISO/IEC 27001 và SOC 2;',
        '• Cơ quan Nhà nước có thẩm quyền theo văn bản yêu cầu chính thức theo quy định của pháp luật Việt Nam.'
      ]
    },
    {
      id: 'privacy-sec-4',
      title: '4. Lưu Trữ Và Bảo Mật Dữ Liệu',
      content: [
        'Dữ liệu cá nhân được lưu trữ an toàn trên hệ thống máy chủ được bảo vệ bằng tường lửa và công nghệ mã hóa hiện đại (mã hóa đường truyền TLS 1.3 và mã hóa dữ liệu tĩnh AES-256).',
        'Thời gian lưu trữ: Dữ liệu được lưu trữ trong suốt thời gian diễn ra giải đấu BTI 2027 và một khoảng thời gian hợp lý sau đó để đối soát, trao giải, giải quyết khiếu nại hoặc lưu trữ nhật ký an ninh mạng tối thiểu 12 tháng theo quy định tại Nghị định 53/2022/NĐ-CP.'
      ]
    },
    {
      id: 'privacy-sec-5',
      title: '5. Kiểm Duyệt Nội Dung Tương Tác & Chống Gian Lận',
      content: [
        'Người dùng chịu trách nhiệm cá nhân đối với mọi nội dung bình luận, tiếng hô cổ vũ hoặc câu hỏi do mình đăng tải trên hệ thống.',
        'BTI 2027 có toàn quyền kiểm duyệt tự động, ẩn, xóa hoặc chặn hiển thị các nội dung chứa từ ngữ xúc phạm, vi phạm thuần phong mỹ tục, chứa thông tin sai sự thật hoặc dấu hiệu tiết lộ đề thi.',
        'Áp dụng các thuật toán phân tích hành vi và kiểm tra thời gian thực để ngăn chặn các nỗ lực can thiệp bất hợp pháp vào đồng hồ thi đấu.'
      ]
    },
    {
      id: 'privacy-sec-6',
      title: '6. Thông Tin Về Đơn Vị Quản Trị Dữ Liệu',
      content: [
        'Đơn vị chủ quản: Ban Tổ chức Cuộc thi Học thuật Beyond The Internet 2027.',
        'Đơn vị vận hành công nghệ: Bộ phận Kỹ thuật & Hạ tầng Số BTI Arena Engine.',
        'Địa chỉ liên hệ: Khu Đô thị Đại học Quốc gia, Thành phố Hồ Chí Minh, Việt Nam.',
        'Email tiếp nhận: bti2027.contact@gmail.com | Website: https://bti2027.edu.vn'
      ]
    },
    {
      id: 'privacy-sec-7',
      title: '7. Quyền Chỉnh Sửa & Rút Lại Dữ Liệu Của Người Dùng',
      content: [
        'Người dùng có toàn quyền truy cập mục "Hồ Sơ Cá Nhân" trên giao diện để tự chỉnh sửa biệt danh, avatar và cập nhật thông tin.',
        'Người dùng có quyền yêu cầu trích xuất dữ liệu hoặc yêu cầu xóa/ẩn danh hóa dữ liệu cá nhân theo quy định tại Điều 16 Luật Bảo vệ dữ liệu cá nhân thông qua chức năng "Pháp lý NĐ 356" trong Hồ sơ.'
      ]
    },
    {
      id: 'privacy-sec-8',
      title: '8. Bảo Mật Thiết Bị Và Trách Nhiệm Người Dùng',
      content: [
        'Khuyến cáo Người dùng bảo mật mật khẩu, không sử dụng tính năng lưu mật khẩu trên thiết bị công cộng.',
        'Đăng xuất khỏi tài khoản sau khi hoàn thành buổi thi đấu trên thiết bị dùng chung để tránh lộ lọt thông tin.',
        'Thông báo ngay cho Ban Tổ chức nếu phát hiện tài khoản có dấu hiệu bị xâm nhập hoặc hoạt động bất thường.'
      ]
    },
    {
      id: 'privacy-sec-9',
      title: '9. Phân Tích Dữ Liệu Ẩn Danh',
      content: [
        'BTI 2027 có thể sử dụng dữ liệu thi đấu dưới dạng tổng hợp và khử nhận dạng hoàn toàn (không chứa thông tin định danh cá nhân) để nghiên cứu độ phân hóa của đề thi, đánh giá hiệu năng hệ thống và nâng cao chất lượng các mùa giải tiếp theo.'
      ]
    },
    {
      id: 'privacy-sec-10',
      title: '10. Phạm Vi Áp Dụng & Hiệu Lực',
      content: [
        'Chính sách này áp dụng cho toàn bộ người dùng truy cập và sử dụng dịch vụ trên website, giao diện khán giả, máy chiếu và bảng điều khiển quản trị của BTI 2027.',
        'Đối với các liên kết chuyển hướng sang dịch vụ của bên thứ ba, việc xử lý dữ liệu sẽ tuân theo chính sách riêng của đơn vị đó.'
      ]
    }
  ]
};

/**
 * 3. CHÍNH SÁCH DỮ LIỆU (DATA POLICY) - 16 ĐIỀU CHI TIẾT
 */
export const DATA_POLICY_DATA: PolicyDocument = {
  id: 'DATA',
  nameVi: 'Chính sách dữ liệu',
  nameEn: 'Data Policy',
  shortDescriptionVi: 'Quy chuẩn kỹ thuật xử lý dữ liệu số, cookie phiên làm việc, chuyển giao dữ liệu và bảo vệ chủ thể dữ liệu.',
  shortDescriptionEn: 'Technical standards on data processing, session cookies, transfers, and data subject rights.',
  sections: [
    {
      id: 'data-sec-1',
      title: '1. Phạm Vi Áp Dụng Và Giải Thích Từ Ngữ',
      content: [
        'Chính sách dữ liệu này áp dụng đối với hoạt động thu thập, phân tích, xử lý, lưu trữ và bảo vệ dữ liệu số khi người dùng truy cập, cài đặt hoặc sử dụng nền tảng BTI 2027 trên mọi thiết bị (máy tính, điện thoại, máy tính bảng, màn hình LED).',
        'Giải thích từ ngữ cốt lõi theo Luật Bảo vệ dữ liệu cá nhân:',
        '• Dữ liệu cá nhân: Thông tin dưới dạng ký hiệu, chữ viết, chữ số, hình ảnh, âm thanh hoặc dạng tương tự gắn liền với một cá nhân cụ thể hoặc giúp xác định một cá nhân cụ thể.',
        '• Dữ liệu cá nhân cơ bản: Họ tên, ngày sinh, giới tính, email, số điện thoại, địa chỉ IP, thông tin thiết bị.',
        '• Xử lý dữ liệu cá nhân: Một hoặc nhiều hoạt động tác động đến dữ liệu cá nhân như thu thập, ghi, phân tích, lưu trữ, chỉnh sửa, truy cập, mã hóa, giải mã, sao chép, truyền đưa hoặc xóa/hủy.',
        '• Chủ thể dữ liệu: Cá nhân được dữ liệu cá nhân phản ánh (thí sinh, khán giả, quản trị viên tham gia đấu trường).',
        '• Bên Kiểm soát và Xử lý dữ liệu: Ban Tổ chức Cuộc thi BTI 2027 trực tiếp quyết định mục đích và phương tiện xử lý dữ liệu.'
      ]
    },
    {
      id: 'data-sec-2',
      title: '2. Nguyên Tắc Và Căn Cứ Xử Lý Dữ Liệu',
      content: [
        'Nguyên tắc xử lý: Tuân thủ pháp luật Việt Nam; công khai, minh bạch về loại dữ liệu và mục đích; chỉ xử lý dữ liệu trong phạm vi cần thiết cho giải đấu; đảm bảo tính chính xác và an toàn thông tin; tuyệt đối không mua bán dữ liệu.',
        'Căn cứ xử lý dữ liệu:',
        '(i) Sự đồng ý tự nguyện, cụ thể, chủ động và có thể kiểm chứng của người dùng (Active Consent);',
        '(ii) Sự cần thiết để thực hiện thỏa thuận tham gia đấu trường học thuật;',
        '(iii) Thực hiện nghĩa vụ pháp lý theo Luật An ninh mạng và pháp luật về bảo vệ dữ liệu cá nhân.'
      ]
    },
    {
      id: 'data-sec-3',
      title: '3. Phân Loại Dữ Liệu Thu Thập',
      content: [
        'Dữ liệu người dùng chủ động cung cấp: Họ tên, biệt danh, email, số điện thoại, trường lớp, ảnh đại diện.',
        'Dữ liệu phát sinh trong thi đấu: Lịch sử chọn đáp án trắc nghiệm, thời gian bấm chuông giành quyền trả lời, điểm số từng vòng, nội dung bình luận cổ vũ, câu hỏi gửi cho diễn giả.',
        'Dữ liệu thiết bị và kết nối: Địa chỉ IP, loại trình duyệt, hệ điều hành, độ phân giải màn hình, độ trễ mạng WebSocket (Ping/Pong RTT), mã định danh phiên thi đấu (Session Token).',
        'Dữ liệu nhật ký an ninh: Thời điểm đăng nhập, sự kiện kết nối/ngắt kết nối, dấu hiệu gian lận kỹ thuật và báo cáo chẩn đoán lỗi.'
      ]
    },
    {
      id: 'data-sec-4',
      title: '4. Mục Đích Xử Lý Dữ Liệu',
      content: [
        'Cung cấp môi trường thi đấu trực tuyến thời gian thực với độ trễ siêu thấp;',
        'Đồng bộ điểm số tức thời giữa máy chủ, khán giả tại hội trường và màn chiếu LED;',
        'Tính toán thời gian còn lại của các vòng thi đấu (Time Estimator) chính xác đến từng mili-giây;',
        'Phát hiện sớm và ngăn chặn các hành vi gian lận kỹ thuật, bot spam đáp án;',
        'Lập báo cáo tổng kết, thống kê độ khó của bộ đề thi và vinh danh người chiến thắng.'
      ]
    },
    {
      id: 'data-sec-5',
      title: '5. Cơ Chế Cookie & Lưu Trữ Cục Bộ (LocalStorage theo Chuẩn GDPR & ePrivacy)',
      content: [
        'BTI 2027 tuân thủ Quy định chung về bảo vệ dữ liệu Châu Âu (GDPR Điều 7) và Chỉ thị ePrivacy 2002/58/EC trong việc quản lý Cookie & LocalStorage:',
        '• Nhóm Thiết yếu (Strictly Necessary): Lưu token định danh thí sinh (`BTI2026_USER_PROFILE`), chứng thực pháp lý đồng thuận (`bti_pdpd_first_visit_consent_v1`), cấu hình lựa chọn cookie Châu Âu (`bti_cookie_consent_gdpr_v1`) và dữ liệu đồng bộ thời gian NTP (`sync_offset`). Nhóm này luôn bật và không thể tắt do là điều kiện kỹ thuật cốt lõi để vận hành sàn đấu an toàn và chống gian lận.',
        '• Nhóm Tùy chọn (Preferences): Lưu cài đặt âm thanh/nhạc nền, ngôn ngữ hiển thị (Tiếng Việt/English), chế độ tiết kiệm năng lượng pin và bảng màu giao diện. Nhóm này mặc định tắt cho đến khi người dùng chủ động cho phép.',
        '• Nhóm Phân tích (Performance & Analytics): Đo lường độ trễ mạng (latency ping ms), jitter đường truyền thời gian thực nhằm tự động cảnh báo sớm khi tín hiệu mạng của thí sinh bị suy giảm. Mặc định tắt.',
        '• Nhóm Tiếp thị & Truyền thông (Marketing & Media): Nhận diện nguồn giới thiệu chiến dịch từ mạng xã hội học thuật. Mặc định tắt.',
        '• Quyền rút lại hoặc thay đổi đồng thuận: Người dùng có quyền truy cập trung tâm tùy chỉnh Cookie bất kỳ lúc nào thông qua nút "Tùy Chọn Cookie (GDPR)" ở góc màn hình hoặc trong trang Cài đặt hồ sơ cá nhân để điều chỉnh hoặc rút lại sự đồng thuận theo Điều 7(3) GDPR.'
      ]
    },
    {
      id: 'data-sec-6',
      title: '6. Chia Sẻ Và Cung Cấp Dữ Liệu',
      content: [
        'BTI 2027 chỉ chia sẻ dữ liệu trong phạm vi phục vụ giải đấu và theo các nhóm bên nhận cụ thể:',
        '• Nhân sự kỹ thuật và Ban Giám khảo được phân quyền theo nguyên tắc tối thiểu cần biết (Need-to-know);',
        '• Đơn vị cung cấp hạ tầng điện toán đám mây và cơ sở dữ liệu thời gian thực (Google Firebase / Firestore);',
        '• Cơ quan nhà nước có thẩm quyền trong trường hợp phát hiện hành vi xâm phạm an ninh mạng hoặc theo quy định của pháp luật.'
      ]
    },
    {
      id: 'data-sec-7',
      title: '7. Chuyển Dữ Liệu Cá Nhân Xuyên Biên Giới',
      content: [
        'Hạ tầng cơ sở dữ liệu phân tán có thể được lưu trữ và sao lưu tại các trung tâm dữ liệu đạt chuẩn quốc tế của Google Cloud (Khu vực Đông Nam Á / Châu Á).',
        'Khi phát sinh chuyển dữ liệu xuyên biên giới, BTI 2027 thực hiện đầy đủ biện pháp kỹ thuật bảo vệ: mã hóa đầu cuối (End-to-End Encryption), kiểm soát truy cập nghiêm ngặt và lập hồ sơ đánh giá tác động theo quy định của pháp luật Việt Nam.'
      ]
    },
    {
      id: 'data-sec-8',
      title: '8. Thời Gian Lưu Trữ Và Xóa Dữ Liệu',
      content: [
        'Dữ liệu điểm số và thi đấu được lưu trữ đến khi kết thúc toàn bộ chuỗi sự kiện và lễ bế mạc trao giải.',
        'Nhật ký hệ thống an ninh mạng được lưu trữ tối thiểu 12 tháng theo quy định pháp luật.',
        'Sau khi kết thúc mục đích sử dụng, toàn bộ dữ liệu định danh trực tiếp sẽ được xóa bỏ an toàn hoặc tiến hành khử nhận dạng hoàn toàn.'
      ]
    },
    {
      id: 'data-sec-9',
      title: '9. Quyền Của Chủ Thể Dữ Liệu',
      content: [
        'Người dùng có đầy đủ 11 quyền hợp pháp theo Luật Bảo vệ dữ liệu cá nhân:',
        '1. Quyền được biết về hoạt động xử lý dữ liệu của mình;',
        '2. Quyền đồng ý hoặc không đồng ý xử lý dữ liệu;',
        '3. Quyền truy cập và yêu cầu cung cấp bản sao dữ liệu;',
        '4. Quyền rút lại sự đồng ý bất kỳ lúc nào;',
        '5. Quyền yêu cầu xóa dữ liệu cá nhân;',
        '6. Quyền yêu cầu hạn chế xử lý dữ liệu;',
        '7. Quyền phản đối việc xử lý dữ liệu vì mục đích quảng cáo/tiếp thị;',
        '8. Quyền khiếu nại, tố cáo hoặc khởi kiện bảo vệ quyền lợi hợp pháp.'
      ]
    },
    {
      id: 'data-sec-10',
      title: '10. Bảo Vệ Dữ Liệu Của Trẻ Em (Dưới 16 Tuổi)',
      content: [
        'Hệ thống áp dụng cơ chế bảo vệ đặc biệt đối với dữ liệu của người dưới 16 tuổi tham gia giải đấu.',
        'Việc thu thập và xử lý dữ liệu của trẻ em từ đủ 7 tuổi trở lên bắt buộc phải có sự đồng ý của cả trẻ em và cha mẹ/người giám hộ hợp pháp.',
        'BTI 2027 tuyệt đối không sử dụng dữ liệu của trẻ em cho bất kỳ mục đích quảng cáo hoặc khai thác thương mại nào.'
      ]
    },
    {
      id: 'data-sec-11',
      title: '11. Biện Pháp Bảo Vệ Kỹ Thuật & Xử Lý Sự Cố An Ninh',
      content: [
        'Áp dụng kiến trúc đa lớp bảo mật: Tường lửa máy chủ (WAF), phân quyền RBAC, mã hóa đường truyền HTTPS/WSS với chứng chỉ SSL cao cấp.',
        'Quy trình ứng phó sự cố: Khi phát hiện sự cố an ninh dữ liệu, Ban Kỹ thuật BTI 2027 lập tức khoanh vùng, khắc phục lỗ hổng, lưu trữ chứng cứ số và gửi thông báo tới cơ quan quản lý và người dùng bị ảnh hưởng trong thời hạn tối đa 72 giờ theo luật định.'
      ]
    },
    {
      id: 'data-sec-12',
      title: '12. Trách Nhiệm Của Người Dùng',
      content: [
        'Cung cấp thông tin trung thực, chính xác và chịu trách nhiệm về thông tin do mình cung cấp;',
        'Tự bảo vệ tài khoản, thiết bị và không chia sẻ đường dẫn dự thi cá nhân;',
        'Kịp thời thông báo cho Ban Tổ chức khi phát hiện lỗi hệ thống hoặc nguy cơ mất an toàn dữ liệu.'
      ]
    },
    {
      id: 'data-sec-13',
      title: '13. Dịch Vụ & Nền Tảng Bên Thứ Ba',
      content: [
        'Hệ thống có thể dẫn liên kết đến cổng thông tin giáo dục hoặc video phát lại trên YouTube/VTVgo. Khi chuyển sang môi trường bên thứ ba, chính sách bảo mật của đơn vị đó sẽ được áp dụng.'
      ]
    },
    {
      id: 'data-sec-14',
      title: '14. Cập Nhật Chính Sách',
      content: [
        'Chính sách này có thể được cập nhật định kỳ để phản ánh các thay đổi về pháp lý hoặc tính năng công nghệ. Mọi thay đổi trọng yếu đều được hiển thị nổi bật trên màn hình đăng nhập của ứng dụng kèm ngày cập nhật mới nhất.'
      ]
    },
    {
      id: 'data-sec-15',
      title: '15. Đầu Mối Tiếp Nhận Yêu Cầu Quyền Dữ Liệu',
      content: [
        'Mọi yêu cầu thực hiện quyền chủ thể dữ liệu (trích xuất, xóa, rút lại đồng ý) xin vui lòng gửi về:',
        '• Cơ quan: Ban Tổ chức Cuộc thi Beyond The Internet 2027',
        '• Email chuyên trách: privacy.bti2027@gmail.com',
        '• Tiêu đề email chuẩn: [Yêu cầu quyền dữ liệu cá nhân - BTI 2027]',
        'Ban Tổ chức sẽ tiếp nhận, xác minh danh tính và phản hồi bằng văn bản trong vòng 72 giờ làm việc.'
      ]
    },
    {
      id: 'data-sec-16',
      title: '16. Hiệu Lực Và Thứ Bậc Áp Dụng Văn Bản',
      content: [
        'Chính sách dữ liệu này có hiệu lực chính thức từ ngày 01/01/2026 và thay thế mọi quy định trước đây về dữ liệu số của giải đấu.',
        'Trong trường hợp có sự khác biệt giữa Chính sách này và quy định bắt buộc của pháp luật Việt Nam, quy định của pháp luật sẽ được ưu tiên áp dụng.'
      ]
    }
  ]
};

export const ALL_POLICIES: Record<'TERMS' | 'PRIVACY' | 'DATA', PolicyDocument> = {
  TERMS: TERMS_OF_SERVICE_DATA,
  PRIVACY: PRIVACY_POLICY_DATA,
  DATA: DATA_POLICY_DATA
};
