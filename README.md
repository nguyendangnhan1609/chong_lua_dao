# ChínhChủ – bản demo

Web demo tĩnh (HTML + CSS + JS thuần, ES modules, không build) phục vụ bằng nginx:alpine. Toàn bộ dữ liệu là minh họa.

## Chạy bằng Docker

```
docker compose up -d --build
```

Mở http://localhost:8080. Đổi cổng: `PORT=9090 docker compose up -d --build`.

## Chạy không cần Docker

```
python3 -m http.server -d web 8099
```

## Kiểm thử

```
npm test
# hoặc: node --test tests/*.test.mjs
```

Không cần cài thư viện nào.
