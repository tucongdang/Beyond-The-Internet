const fs = require('fs');
let code = fs.readFileSync('src/utils/i18n.ts', 'utf8');

// Vi
code = code.replace(/view_sort_req_name: "Vui lòng nhập tên/, 'view_sort_err_login: "CHƯA ĐĂNG NHẬP",\n    view_sort_err_nodata: "CHƯA CÓ DỮ LIỆU CÂU HỎI",\n    view_sort_err_timeout: "KHÔNG THỂ GỬI ĐÁP ÁN",\n    view_sort_err_incomplete: "ĐÁP ÁN CHƯA HOÀN CHỈNH!",\n    view_sort_err_invalid: "ĐÁP ÁN KHÔNG HỢP LỆ!",\n    view_sort_err_empty: "MỤC CÓ NỘI DUNG RỖNG!",\n    view_sort_req_name: "Vui lòng nhập tên');

// En
code = code.replace(/view_sort_req_name: "Please enter your name/, 'view_sort_err_login: "NOT LOGGED IN",\n    view_sort_err_nodata: "NO QUESTION DATA",\n    view_sort_err_timeout: "CANNOT SUBMIT",\n    view_sort_err_incomplete: "INCOMPLETE ANSWER!",\n    view_sort_err_invalid: "INVALID ANSWER!",\n    view_sort_err_empty: "EMPTY OPTION TEXT!",\n    view_sort_req_name: "Please enter your name');

fs.writeFileSync('src/utils/i18n.ts', code);
console.log("Patched i18n sort error titles");
