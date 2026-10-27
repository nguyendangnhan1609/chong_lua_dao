# ChínhChủ – bản demo

ChínhChủ là ý tưởng hệ thống xác thực website/fanpage: doanh nghiệp trả phí để được xác thực và nhận huy hiệu tick xanh, người dùng tra cứu miễn phí và xem báo cáo kiểm tra kèm nguồn. Đây là **bản demo tĩnh** để trình bày và xin ý kiến trước khi xây hệ thống thật. Toàn bộ dữ liệu là minh họa, không có backend, không có đăng nhập thật, không có thanh toán thật.

Công nghệ: HTML + CSS + JS thuần (ES modules, không bước build), phục vụ bằng nginx:alpine. Dữ liệu lưu trong localStorage của trình duyệt.

## Chạy bằng Docker

```
docker compose up -d --build
```

Mở http://localhost:8080.

Đổi cổng (ví dụ 9090):

```
PORT=9090 docker compose up -d --build
```

Dừng: `docker compose down`.

## Chạy không cần Docker

Chỉ cần Python 3 (không cài thư viện nào). Thư mục phục vụ là `web/`:

```
python3 -m http.server -d web 8080
```

Mở http://localhost:8080. Lưu ý: cách này không có các header bảo mật và cache của nginx, chỉ dùng để xem thử.

## Kiểm thử

```
npm test
# hoặc: node --test tests/*.test.mjs
```

Chạy bằng Node.js (không cần cài thêm gói nào). Test kiểm thang điểm, luồng doanh nghiệp, luồng quản trị, màn Giới thiệu, định dạng nhật ký và một số quy tắc an toàn nội dung.

## Kịch bản demo 5 bước

1. **Tra cứu**: vào "Người dùng", gõ tên hoặc địa chỉ một website mẫu (ví dụ có đuôi `.example`) và xem báo cáo: trạng thái, điểm, từng mục kiểm tra kèm nguồn, ngày và kết quả, phần "Gợi ý AI" (chỉ tham khảo).
2. **Trang mẫu có tick**: vào menu "Trang mẫu", bấm vào huy hiệu tick của một trang để mở đúng báo cáo của trang đó.
3. **Doanh nghiệp đăng ký và chứng minh**: vào "Doanh nghiệp", đăng ký một website/fanpage mới, chọn một cách chứng minh quyền sở hữu (chèn mã, file xác nhận hoặc mã qua email) rồi bấm "Kiểm tra" (giả lập, chờ 1–2 giây). Theo dõi điểm và việc cần làm.
4. **Quản trị cấp, nâng, thu hồi**: vào "Quản trị", mở hồ sơ vừa đăng ký, xem kết quả kiểm tra tự động, nhập thẩm định thực tế (gọi điện, gặp trực tiếp, minh chứng giả lập), rồi cấp mức thấp, nâng mức cao (khi đủ điều kiện) và thử thu hồi. Mọi thao tác ghi vào nhật ký hồ sơ và phản ánh sang hai góc nhìn còn lại. Nút "Đặt lại dữ liệu mẫu" đưa dữ liệu về ban đầu.
5. **Giới thiệu demo**: vào "Giới thiệu" để xem giải thích cho người không chuyên, thang điểm, ý nghĩa 4 trạng thái, phần "Thử nhanh luồng đầu-cuối" và danh sách phần giả lập ở cuối trang.

## Gắn tên miền chinhchu.qrquiz.io.vn

Ứng dụng dùng hash-routing (`#/tra-cuu`, `#/doanh-nghiep`, …) nên reverse proxy chỉ cần chuyển tiếp toàn bộ đường dẫn tới cổng 8080 của máy chạy Docker, không cần viết lại đường dẫn.

1. Trỏ bản ghi DNS `chinhchu.qrquiz.io.vn` về địa chỉ IP của máy chủ.
2. Trên máy chủ, cấu hình nginx làm reverse proxy (ví dụ file `/etc/nginx/sites-available/chinhchu`):

```
server {
    listen 80;
    server_name chinhchu.qrquiz.io.vn;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Kích hoạt cấu hình, kiểm tra và nạp lại nginx: `sudo nginx -t && sudo systemctl reload nginx`.
4. Bật HTTPS (ví dụ bằng certbot): `sudo certbot --nginx -d chinhchu.qrquiz.io.vn`.

Nếu đổi cổng bằng `PORT=...`, nhớ sửa `proxy_pass` cho khớp.

## Phần giả lập

Đây là danh sách những gì **không** thật trong bản demo (khớp với `web/js/simulated.js`):

1. Dữ liệu 6 website/fanpage (WF) mẫu
2. Tra cứu nguồn chính phủ/MST
3. Xác minh số điện thoại (SĐT)
4. Lịch sử tạo/WHOIS
5. Danh sách giả mạo
6. Gợi ý AI (văn bản soạn sẵn)
7. Chứng minh quyền sở hữu
8. Thanh toán phí
9. Thẩm định gọi điện/gặp trực tiếp/minh chứng
10. Khiếu nại
11. Đăng nhập/phân quyền
12. Huy hiệu tick nhúng
13. Lưu trữ (chỉ localStorage)

Các tên và miền trong dữ liệu mẫu là hư cấu, đuôi `.example` hoặc `.test`, không liên quan đến thương hiệu thật.
