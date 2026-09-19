const fs = require('fs');

let code = fs.readFileSync('src/components/AudienceView.tsx', 'utf8');

code = code.replace(/localLanguage === 'en' \? 'NOT LOGGED IN' : 'CHƯA ĐĂNG NHẬP'/g, 't("view_sort_err_login", localLanguage)');
code = code.replace(/'CHƯA CÓ DỮ LIỆU CÂU HỎI'/g, 't("view_sort_err_nodata", localLanguage)');
code = code.replace(/localLanguage === 'en' \? 'CANNOT SUBMIT' : 'KHÔNG THỂ GỬI ĐÁP ÁN'/g, 't("view_sort_err_timeout", localLanguage)');
code = code.replace(/localLanguage === 'en' \? 'INCOMPLETE ANSWER!' : 'ĐÁP ÁN CHƯA HOÀN CHỈNH!'/g, 't("view_sort_err_incomplete", localLanguage)');
code = code.replace(/localLanguage === 'en' \? 'INVALID ANSWER!' : 'ĐÁP ÁN KHÔNG HỢP LỆ!'/g, 't("view_sort_err_invalid", localLanguage)');
code = code.replace(/'MỤC CÓ NỘI DUNG RỖNG!'/g, 't("view_sort_err_empty", localLanguage)');

fs.writeFileSync('src/components/AudienceView.tsx', code);
console.log("Patched AudienceView sort error titles");
