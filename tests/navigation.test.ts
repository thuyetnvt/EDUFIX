import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPath, itemsForRole, mobileItemsForRole } from "../apps/web/lib/navigation";
import { vi } from "../apps/web/lib/i18n";

test("tập trung quyền điều hướng cho reporter", () => {
  const reporterPaths = [
    "/mobile/home",
    "/mobile/scan",
    "/mobile/my-incidents",
    "/incidents/new",
    "/incidents/incident-123",
    "/scan/qr-token",
    "/notifications",
  ];
  for (const path of reporterPaths) assert.equal(canAccessPath("REPORTER", path), true, path);
  assert.equal(canAccessPath("REPORTER", "/assets"), false);
  assert.equal(canAccessPath("REPORTER", "/audit-logs"), false);
  assert.ok(itemsForRole("REPORTER").some((item) => item.href === "/mobile/scan"));
});

test("vai trò quản lý và kỹ thuật viên không vượt quyền navigation", () => {
  assert.equal(canAccessPath("FACILITY_MANAGER", "/audit-logs"), false);
  assert.equal(canAccessPath("ADMIN", "/audit-logs"), true);
  assert.equal(canAccessPath("TECHNICIAN", "/maintenance/tasks/task-1"), true);
  assert.equal(canAccessPath("TECHNICIAN", "/maintenance"), true);
  assert.equal(canAccessPath("TECHNICIAN", "/assets"), false);
});

test("điều hướng mobile tách theo vai trò", () => {
  assert.ok(mobileItemsForRole("REPORTER").includes("/mobile/scan"));
  assert.ok(mobileItemsForRole("TECHNICIAN").includes("/technician/maintenance"));
  assert.equal(mobileItemsForRole("TECHNICIAN").includes("/mobile/scan"), false);
});

test("bảng dịch enum hiển thị tiếng Việt theo domain", () => {
  assert.equal(vi("LOW_STOCK", "inventoryStatus"), "Tồn kho thấp");
  assert.equal(vi("AWAITING_CONFIRMATION", "incidentStatus"), "Chờ xác nhận");
  assert.equal(vi("MONTHLY", "recurrence"), "Hàng tháng");
  assert.equal(vi("UNKNOWN_ENUM", "incidentStatus"), "UNKNOWN_ENUM");
});
