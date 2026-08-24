import test from "node:test";
import assert from "node:assert/strict";
import { IncidentStatus, RecurrenceType, StockTransactionType } from "@prisma/client";
import { canTransition } from "../apps/api/src/incident-flow";
import { missingChecklistReasons, nextMaintenanceDate } from "../apps/api/src/maintenance-flow";
import { nextStockQuantity } from "../apps/api/src/inventory-flow";

test("production incident flow accepts the primary workflow", () => {
  assert.equal(canTransition(IncidentStatus.NEW, IncidentStatus.ASSIGNED), true);
  assert.equal(
    canTransition(IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS),
    true,
  );
  assert.equal(
    canTransition(
      IncidentStatus.IN_PROGRESS,
      IncidentStatus.AWAITING_CONFIRMATION,
    ),
    true,
  );
  assert.equal(
    canTransition(
      IncidentStatus.AWAITING_CONFIRMATION,
      IncidentStatus.COMPLETED,
    ),
    true,
  );
  assert.equal(
    canTransition(
      IncidentStatus.AWAITING_CONFIRMATION,
      IncidentStatus.REOPENED,
    ),
    true,
  );
});

test("production incident flow rejects shortcut and terminal transitions", () => {
  assert.equal(canTransition(IncidentStatus.COMPLETED, IncidentStatus.NEW), false);
  assert.equal(canTransition(IncidentStatus.NEW, IncidentStatus.COMPLETED), false);
  assert.equal(
    canTransition(
      IncidentStatus.WAITING_FOR_PARTS,
      IncidentStatus.AWAITING_CONFIRMATION,
    ),
    false,
  );
  assert.equal(
    canTransition(IncidentStatus.REOPENED, IncidentStatus.CANCELLED),
    false,
  );
});

test("production stock calculation preserves the transaction semantics", () => {
  assert.equal(
    nextStockQuantity(10, StockTransactionType.STOCK_IN, 4),
    14,
  );
  assert.equal(
    nextStockQuantity(10, StockTransactionType.STOCK_OUT, 4),
    6,
  );
  assert.equal(
    nextStockQuantity(10, StockTransactionType.ADJUSTMENT, 3),
    3,
  );
  assert.equal(
    nextStockQuantity(2, StockTransactionType.STOCK_OUT, 3) < 0,
    true,
  );
});

test("production maintenance scheduling advances by the configured interval", () => {
  const due = nextMaintenanceDate(
    new Date("2026-08-15T00:00:00.000Z"),
    RecurrenceType.QUARTERLY,
    1,
  );
  assert.equal(due.toISOString(), "2026-11-15T00:00:00.000Z");
});

test("maintenance checklist requires completion or a skip reason", () => {
  assert.deepEqual(
    missingChecklistReasons(["Nguồn điện", "Vệ sinh"], [
      { item: "Nguồn điện", completed: true },
      { item: "Vệ sinh", completed: false },
    ]),
    ["Vệ sinh"],
  );
  assert.deepEqual(
    missingChecklistReasons(["Nguồn điện"], [
      { item: "Nguồn điện", completed: false, note: "Không thể kiểm tra vì mất điện" },
    ]),
    [],
  );
});
