import assert from "node:assert/strict";
import { readAdminSession } from "../packages/shared/src/admin-auth.ts";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
globalThis.window = {};
globalThis.sessionStorage = storage();
globalThis.localStorage = storage();
const key = "ecoglobe.admin.tab-session";
const session = {
  email: "real-admin@example.test",
  name: "Test administrator",
  role: "Platform administrator",
  expiresAt: Date.now() + 60_000,
  remembered: false,
};
sessionStorage.setItem(key, JSON.stringify(session));
assert.deepEqual(readAdminSession(), session);
for (const invalid of [
  { ...session, expiresAt: Date.now() - 1 },
  { ...session, expiresAt: undefined },
  { ...session, role: "buyer" },
  { ...session, email: 123 },
  { ...session, remembered: undefined },
]) {
  sessionStorage.setItem(key, JSON.stringify(invalid));
  assert.equal(readAdminSession(), null);
}
sessionStorage.setItem(key, "malformed");
assert.equal(readAdminSession(), null);
console.log("Admin session mirror: real identity, expiry, malformed data and role checks passed.");
