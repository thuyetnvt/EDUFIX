# Kiến trúc EduFix

EduFix là modular monolith trong pnpm workspace:

- `apps/web`: Next.js App Router, React và PWA service worker.
- `apps/api`: NestJS REST API, Prisma ORM và tác vụ lịch bằng `@nestjs/schedule`.
- PostgreSQL 16: dữ liệu giao dịch và audit.
- Thư mục `apps/api/uploads`: ảnh sự cố trong môi trường local; production nên thay bằng object storage.

## Luồng yêu cầu

Trình duyệt gọi API bằng access token 15 phút. Khi hết hạn, API client dùng refresh token một lần để tạo cặp token mới. Guard kiểm tra chữ ký JWT, trạng thái tài khoản và Role guard kiểm tra quyền route.

Quy trình sự cố được kiểm soát bằng transition table:

`NEW → ASSIGNED → IN_PROGRESS ↔ WAITING_FOR_PARTS → AWAITING_CONFIRMATION → COMPLETED`

Người báo có thể chuyển `AWAITING_CONFIRMATION → REOPENED`; quản lý phân công lại. Mọi lần chuyển trạng thái được lưu ở `IncidentStatusHistory`.

## AI không chặn nghiệp vụ

`AiService` dùng interface adapter. Khi `AI_PROVIDER=openai` và có API key, hệ thống gọi provider; nếu thiếu cấu hình hoặc provider lỗi, rule-based assistant vẫn trả mức ưu tiên, nhóm lỗi và hướng dẫn an toàn. Tìm phiếu trùng dựa trên cùng thiết bị, cửa sổ 30 ngày và độ tương đồng token.

## Ranh giới phân quyền

- Admin: toàn quyền và xem audit.
- Facility manager: tài sản, vị trí, phân công, kho, bảo trì, báo cáo và SLA.
- Technician: chỉ xem phiếu/công việc được giao và cập nhật kết quả.
- Reporter: chỉ xem phiếu của mình, bình luận công khai, xác nhận và đánh giá.
