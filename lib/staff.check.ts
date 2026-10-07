import assert from "node:assert/strict";
import {
  byGender,
  CASHIERS,
  SEED_ROLES,
  STAFF,
  STAFF_ROSTER,
  isCashierName,
  isStaffName,
  resolveRole,
  staffBoard,
} from "./staff.ts";

assert.equal(isStaffName("Deimos Lolivan"), true);
assert.equal(isStaffName("Nobody"), false);
assert.equal(isCashierName("Arias Alphebias"), true);
assert.equal(isCashierName("Deimos Lolivan"), false);
assert.equal(CASHIERS.length, 3);

const added = resolveRole(SEED_ROLES, "ผู้จัดการ");
assert.equal(added?.isNew, true);
assert.equal(added?.id, "ผู้จัดการ");
assert.equal(resolveRole(SEED_ROLES, "พนักงานแคชเชียร์")?.id, "cashier");
assert.equal(resolveRole(SEED_ROLES, "  ") , null);

const board = staffBoard(STAFF_ROSTER, [
  { name: "Deimos Lolivan", free: true },
  { name: "Nope", free: true },
  { name: "Rachel Kaze", free: "yes" },
]);
assert.equal(board.length, STAFF.length);
assert.equal(board.find((row) => row.name === "Deimos Lolivan")?.free, true);
assert.equal(board.filter((row) => row.free).length, 1);

// every member lands in exactly one gender group
assert.equal(
  byGender(board, "f").length + byGender(board, "m").length,
  board.length,
);
assert.ok(byGender(board, "f").every((row) => row.gender === "f"));

console.log("staff helper ok");
