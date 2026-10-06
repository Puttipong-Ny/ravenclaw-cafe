import assert from "node:assert/strict";
import { byGender, STAFF, isStaffName, staffBoard } from "./staff";

assert.equal(isStaffName("Deimos Lolivan"), true);
assert.equal(isStaffName("Nobody"), false);

const board = staffBoard([
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
