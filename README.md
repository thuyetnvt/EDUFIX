# EduFix

EduFix là hệ thống quản lý tài sản, sự cố và bảo trì thiết bị cho trường học. Người dùng có thể quét QR để báo hỏng; quản lý tiếp nhận và phân công; kỹ thuật viên cập nhật quá trình sửa; người báo xác nhận và đánh giá kết quả.

## Chức năng

- Đăng nhập JWT, refresh-token rotation và phân quyền `ADMIN`, `FACILITY_MANAGER`, `TECHNICIAN`, `REPORTER`.
- Cấu trúc vị trí cơ sở → tòa nhà → tầng → phòng.
- Danh mục tài sản, QR token, điều chuyển và lịch sử vòng đời.
- Quy trình sự cố đầy đủ: tạo, AI phân loại, phân công, xử lý, chờ vật tư, xác nhận, mở lại, đánh giá, bình luận và ảnh đính kèm.
- Dashboard SLA, thông báo, audit log, báo cáo CSV và chi phí.
- Kế hoạch bảo trì lặp, công việc tự sinh và checklist.
- Kho vật tư với sổ giao dịch bất biến, cảnh báo tồn thấp và chống âm kho.
- Giao diện responsive theo vai trò và PWA có offline shell.

## Chạy nhanh

Yêu cầu Node.js 20+, pnpm 10+ và Docker Desktop:

```powershell
Copy-Item .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Truy cập:

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- Health: http://localhost:4000/api/v1/health
- Swagger: http://localhost:4000/api/docs

## Tài khoản demo

Mật khẩu chung: `ChangeMe123!`.

| Vai trò       | Email                                                 |
| ------------- | ----------------------------------------------------- |
| Quản trị viên | `admin@edufix.local`                                  |
| Quản lý       | `manager@edufix.local`                                |
| Kỹ thuật viên | `tech1@edufix.local`, `tech2@edufix.local`            |
| Người báo     | `reporter1@edufix.local` đến `reporter5@edufix.local` |

## Kiểm tra chất lượng

```powershell
pnpm check
```

Kiểm thử E2E cần API đang chạy:

```powershell
$env:EDUFIX_E2E_URL='http://localhost:4000/api/v1'
pnpm test:e2e
```

Chi tiết nằm trong [docs/architecture.md](docs/architecture.md), [docs/database.md](docs/database.md), [docs/testing.md](docs/testing.md), [docs/deployment.md](docs/deployment.md) và [docs/user-guide.md](docs/user-guide.md).
