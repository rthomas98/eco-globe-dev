import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCartLine, type CartLine } from "./cart-lines.ts";

type Line = CartLine & { title: string; price: number };
const pvc = { id: "27", title: "PVC Scrap", price: 3, moq: 10 };

test("Buy Now on the same item twice keeps exactly the selected quantity", () => {
  let cart: Line[] = [];
  cart = mergeCartLine<Line>(cart, { ...pvc, quantity: 12 }, { exactQuantity: true });
  cart = mergeCartLine<Line>(cart, { ...pvc, quantity: 12 }, { exactQuantity: true });
  assert.equal(cart.length, 1);
  assert.equal(cart[0]?.quantity, 12);
});

test("Buy Now replaces an earlier Add to Cart quantity and refreshes saved fields", () => {
  let cart: Line[] = mergeCartLine<Line>([], { ...pvc, quantity: 30 });
  cart = mergeCartLine<Line>(cart, { ...pvc, price: 4, quantity: 10 }, { exactQuantity: true });
  assert.deepEqual(cart, [{ ...pvc, price: 4, quantity: 10 }]);
});

test("Add to Cart still increases an existing line and leaves other lines alone", () => {
  const other: Line = { id: "19", title: "Tar", price: 1, moq: 5, quantity: 5 };
  let cart: Line[] = [other];
  cart = mergeCartLine<Line>(cart, { ...pvc, quantity: 10 });
  cart = mergeCartLine<Line>(cart, { ...pvc, quantity: 10 });
  assert.equal(cart.find((l) => l.id === "27")?.quantity, 20);
  assert.equal(cart.find((l) => l.id === "19"), other);
  assert.equal(mergeCartLine<Line>([], { ...pvc })[0]?.quantity, 10);
});
