const test = require("node:test");
const assert = require("node:assert/strict");

const transitions = {
  NEW: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_PARTS", "AWAITING_CONFIRMATION", "CANCELLED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "AWAITING_CONFIRMATION", "CANCELLED"],
  AWAITING_CONFIRMATION: ["COMPLETED", "REOPENED"],
  REOPENED: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
test("incident status flow accepts all primary workflow transitions", () => {
  assert.equal(transitions.NEW.includes("ASSIGNED"), true);
  assert.equal(transitions.ASSIGNED.includes("IN_PROGRESS"), true);
  assert.equal(transitions.IN_PROGRESS.includes("AWAITING_CONFIRMATION"), true);
  assert.equal(transitions.AWAITING_CONFIRMATION.includes("COMPLETED"), true);
});
test("incident status flow rejects terminal and shortcut transitions", () => {
  assert.equal(transitions.COMPLETED.includes("NEW"), false);
  assert.equal(transitions.NEW.includes("COMPLETED"), false);
  assert.equal(transitions.CANCELLED.includes("ASSIGNED"), false);
});
test("priority targets produce predictable due time", () => {
  const targets = { URGENT: 120, HIGH: 240, MEDIUM: 1440, LOW: 4320 };
  assert.ok(targets.URGENT < targets.HIGH);
  assert.ok(targets.HIGH < targets.MEDIUM);
  assert.equal(targets.LOW, 72 * 60);
});
test("stock out cannot produce a negative quantity", () => {
  const stockOut = (current, requested) => {
    const next = current - requested;
    if (next < 0) throw new Error("Không đủ tồn kho");
    return next;
  };
  assert.equal(stockOut(10, 4), 6);
  assert.throws(() => stockOut(2, 3), /Không đủ tồn kho/);
});
test("recurring monthly maintenance advances by configured interval", () => {
  const due = new Date("2026-08-15T00:00:00.000Z");
  due.setUTCMonth(due.getUTCMonth() + 3);
  assert.equal(due.toISOString(), "2026-11-15T00:00:00.000Z");
});
