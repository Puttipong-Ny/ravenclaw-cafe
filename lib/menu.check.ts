import assert from "node:assert/strict";
import { calcDiscount, calcSubtotal, calcTotal } from "./menu";

const sub = calcSubtotal([
  { price: 75, qty: 2 },
  { price: 55, qty: 1 },
]);
assert.equal(sub, 205);
assert.equal(calcDiscount(sub, { type: "percent", value: 10 }), 21);
assert.equal(calcTotal(sub, { type: "percent", value: 10 }), 184);
assert.equal(calcDiscount(sub, { type: "amount", value: 50 }), 50);
assert.equal(calcDiscount(sub, { type: "amount", value: 999 }), 205);
assert.equal(calcDiscount(sub, { type: "none", value: 10 }), 0);
assert.equal(calcTotal(0, { type: "percent", value: 50 }), 0);

console.log("menu calc ok");
