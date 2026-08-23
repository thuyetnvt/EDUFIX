# Cơ sở dữ liệu

Schema nguồn nằm tại `apps/api/prisma/schema.prisma`; migration có version trong `apps/api/prisma/migrations`.

## Nhóm bảng

- Danh tính: `User`, `Session`.
- Cấu trúc và tài sản: `Location`, `AssetCategory`, `Asset`, `AssetTransfer`, `AssetDocument`.
- Sự cố: `Incident`, `IncidentAssignment`, `IncidentStatusHistory`, `IncidentComment`, `Attachment`, `IncidentRating`.
- Bảo trì: `MaintenancePlan`, `MaintenanceTask`.
- Kho: `Part`, `StockTransaction`, `IncidentPart`.
- Hệ thống: `Notification`, `AuditLog`, `PriorityTarget`.

Các bất biến quan trọng:

- Email, mã tài sản, mã vị trí, mã vật tư và QR token là duy nhất.
- Công việc bảo trì duy nhất theo cặp kế hoạch/ngày hạn để cron chạy lặp không tạo trùng.
- Giao dịch kho không bị sửa; tồn kho được cập nhật cùng transaction và không được âm.
- Phiếu luôn giữ history riêng thay vì suy diễn từ `updatedAt`.

## Lệnh vận hành

```powershell
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
```

Seed idempotent tạo 9 tài khoản, 5 phòng, 30 tài sản, 20 phiếu, 3 kế hoạch bảo trì và 8 vật tư.
