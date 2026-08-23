# Kiểm thử

`pnpm check` chạy lint, TypeScript, unit/domain tests và production build cho cả API lẫn web.

## E2E

Khởi động PostgreSQL, seed và API, sau đó:

```powershell
$env:EDUFIX_E2E_URL='http://localhost:4000/api/v1'
pnpm test:e2e
```

Bài E2E kiểm tra health, login, RBAC và vòng đời thật:

1. Reporter bị chặn khỏi danh sách người dùng.
2. Reporter tạo phiếu và nhận AI suggestion.
3. Manager phân công technician.
4. Technician bắt đầu và gửi kết quả sửa chữa.
5. Reporter xác nhận, đánh giá.
6. Asset trở về `ACTIVE` và history kết thúc bằng `COMPLETED`.

## Checklist nghiệm thu thủ công

- Thử từng tài khoản demo và kiểm tra menu theo vai trò.
- Mở web ở 390 px, 768 px và desktop.
- Quét URL QR từ trang thiết bị, tạo phiếu và tải ảnh JPEG/PNG/WebP dưới 5 MB.
- Thử chuyển trạng thái sai và xuất kho vượt tồn để xác nhận API từ chối.
- Tắt cấu hình AI ngoài để xác nhận rule-based fallback vẫn tạo được phiếu.
- Mở Swagger và kiểm tra các nhóm route.
