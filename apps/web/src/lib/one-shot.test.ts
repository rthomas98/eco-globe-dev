import { test } from "node:test";
import assert from "node:assert/strict";
import { oneShot } from "./one-shot.ts";

test("the load event and the completed-document fallback print only once", () => {
  let prints = 0;
  const print = oneShot(() => {
    prints += 1;
  });
  print(); // window load
  print(); // 800ms readyState === "complete" fallback after Save as PDF
  assert.equal(prints, 1);
});

test("a throwing first call still blocks later calls", () => {
  let calls = 0;
  const run = oneShot(() => {
    calls += 1;
    throw new Error("print blocked");
  });
  assert.throws(run);
  run();
  assert.equal(calls, 1);
});

test("a re-entrant call during the first run is ignored", () => {
  let calls = 0;
  const run: () => void = oneShot(() => {
    calls += 1;
    run();
  });
  run();
  assert.equal(calls, 1);
});
