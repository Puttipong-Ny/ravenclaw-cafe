import assert from "node:assert/strict";
import {
  buildTrustedLines,
  calcDiscount,
  calcSetPromo,
  calcSubtotal,
  calcTotal,
  lineContents,
  lineMatchesQuery,
  parseDiscount,
  tallyOrder,
} from "./menu";

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

const trusted = buildTrustedLines([
  { id: "set-a", qty: 2 },
  { id: "set-b", qty: 1 },
]);
assert.ok(!("error" in trusted));
if (!("error" in trusted)) {
  assert.equal(trusted.subtotal, 900);
  assert.equal(trusted.lines[0].price, 300);
}
assert.equal(parseDiscount({ type: "percent", value: 10 }).type, "percent");
assert.ok("error" in buildTrustedLines([{ id: "nope", qty: 1 }]));

assert.equal(calcSetPromo([{ id: "set-special", qty: 2 }]), 0);
assert.equal(calcSetPromo([{ id: "set-special", qty: 3 }]), 500);
assert.equal(calcSetPromo([{ id: "set-special", qty: 4 }]), 500);
assert.equal(calcSetPromo([{ id: "set-special", qty: 6 }]), 1000);

const threeSpecial = tallyOrder(
  [{ id: "set-special", price: 3500, qty: 3 }],
  { type: "none", value: 0 },
);
assert.equal(threeSpecial.subtotal, 10500);
assert.equal(threeSpecial.promo, 500);
assert.equal(threeSpecial.total, 10000);

const mixed = tallyOrder(
  [
    { id: "set-a", price: 300, qty: 1 },
    { id: "set-special", price: 3500, qty: 3 },
  ],
  { type: "none", value: 0 },
);
assert.equal(mixed.total, 10300);
assert.equal(mixed.tipAmt, 0);

const tipped = tallyOrder(
  [{ id: "set-a", price: 300, qty: 1 }],
  { type: "amount", value: 50 },
  { type: "percent", value: 10 },
);
assert.equal(tipped.tipAmt, 25);
assert.equal(tipped.total, 275);

const flatTip = tallyOrder(
  [{ id: "set-a", price: 300, qty: 1 }],
  { type: "none", value: 0 },
  { type: "amount", value: 40 },
);
assert.equal(flatTip.tipAmt, 40);
assert.equal(flatTip.total, 340);
assert.deepEqual(lineContents("set-a", "Set A"), ["Cupcake", "Charm Tea"]);
assert.deepEqual(lineContents("gone", "Fairy Tale"), ["Fairy Tale"]);
assert.equal(lineMatchesQuery({ id: "set-a", name: "Set A" }, "cup"), true);
assert.equal(lineMatchesQuery({ id: "set-a", name: "Set A" }, "set b"), false);
assert.equal(lineMatchesQuery({ id: "gone", name: "Fairy Tale" }, "tale"), true);
assert.equal(lineMatchesQuery({ id: "set-a", name: "Set A" }, "  "), true);

console.log("menu calc ok");
