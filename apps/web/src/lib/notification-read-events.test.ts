import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyReadIds,
  broadcastNotificationsRead,
  notificationScopeKey,
  subscribeNotificationsRead,
} from "./notification-read-events.ts";

test("confirmed reads reach every subscriber and cleanup detaches", () => {
  const target = new EventTarget();
  const seenA: string[][] = [];
  const seenB: string[][] = [];
  const offA = subscribeNotificationsRead((ids) => seenA.push(ids), target);
  const offB = subscribeNotificationsRead((ids) => seenB.push(ids), target);
  broadcastNotificationsRead(["api-1", "api-2"], target);
  assert.deepEqual(seenA, [["api-1", "api-2"]]);
  assert.deepEqual(seenB, [["api-1", "api-2"]]);
  offA();
  broadcastNotificationsRead(["api-3"], target);
  assert.equal(seenA.length, 1, "unsubscribed listener no longer fires");
  assert.equal(seenB.length, 2);
  offB();
});

test("empty broadcasts are not sent", () => {
  const target = new EventTarget();
  let calls = 0;
  const off = subscribeNotificationsRead(() => calls++, target);
  broadcastNotificationsRead([], target);
  assert.equal(calls, 0);
  off();
});

test("applyReadIds marks only matching unread items and keeps identity when unchanged", () => {
  const items = [
    { id: "api-1", unread: true },
    { id: "api-2", unread: true },
    { id: "api-3", unread: false },
  ];
  const next = applyReadIds(items, ["api-2", "api-3"]);
  assert.deepEqual(next.map((i) => i.unread), [true, false, false]);
  assert.equal(applyReadIds(next, ["api-2"]), next, "no change returns the same array");
  assert.equal(next.filter((i) => i.unread).length, 1, "badge count drops immediately");
});

test("scope key changes with user and company", () => {
  assert.equal(notificationScopeKey(undefined, 1), null);
  assert.notEqual(notificationScopeKey(1, 10), notificationScopeKey(1, 20));
  assert.notEqual(notificationScopeKey(1, 10), notificationScopeKey(2, 10));
});
