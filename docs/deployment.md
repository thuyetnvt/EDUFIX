# Triển khai

## Môi trường

Sao chép `.env.example`, sau đó đổi tối thiểu:

- `DATABASE_URL`: PostgreSQL production có TLS nếu nhà cung cấp hỗ trợ.
- `JWT_SECRET`: chuỗi ngẫu nhiên dài, không dùng giá trị demo.
- `WEB_ORIGIN`: danh sách origin được phép, phân cách bằng dấu phẩy.
- `NEXT_PUBLIC_API_URL`: URL public của API.
- `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`: tùy chọn.

## Quy trình release

```powershell
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm build
pnpm start
```

Health check dùng `GET /api/v1/health`. Swagger ở `/api/docs`.

Để chạy toàn bộ web, API và PostgreSQL bằng container:

```powershell
docker compose --profile full up -d --build
```

## Production hardening

- Đặt reverse proxy HTTPS và giới hạn kích thước request.
- Dùng object storage + signed URL thay cho ổ đĩa local cho attachment.
- Backup PostgreSQL định kỳ và thử restore.
- Tách tài khoản DB có quyền migration khỏi tài khoản runtime.
- Thu thập log, metric latency/error và cảnh báo health.
- Không chạy seed demo trên dữ liệu thật.
