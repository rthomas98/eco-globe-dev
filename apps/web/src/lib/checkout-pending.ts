"use client";

import { readDemoUser } from "./demo-user";
import { clearCheckoutAttemptKeyValue } from "./api-orders";
import {
  isPendingEntry,
  pendingScopeKey,
  validPendingEntries,
  type PendingCheckout,
  type PendingCheckoutRequest,
} from "./checkout-pending-core";

export type { PendingCheckout, PendingCheckoutRequest };

/** Scope of the current session's pending store (user:company), or null. */
export function currentPendingScope(): string | null {
  return scopeKey();
}

/**
 * Unpaid checkout orders started from the cart, kept in sessionStorage (same
 * tab survives the Stripe redirect). Each entry holds the exact request and
 * idempotency key, so "Continue payment" resumes the same saved order instead
 * of creating a duplicate. Only ids, the key and the checkout request body are
 * stored — no payment data. Entries are removed once the backend reports the
 * order paid, expired or cancelled.
 */

/**
 * Storage is scoped to the signed-in user and active company, so a saved
 * delivery address or request is never shown or resumed for another user or
 * company after logout or a company switch. Without a scope nothing is read
 * or written.
 */
function scopeKey(): string | null {
  const user = readDemoUser();
  return pendingScopeKey(user?.id, user?.activeCompanyId);
}

function readAll(): Record<string, PendingCheckout> {
  const key = scopeKey();
  if (!key) return {};
  try {
    const raw = sessionStorage.getItem(key);
    // Drop anything malformed rather than resuming it.
    return validPendingEntries(raw ? (JSON.parse(raw) as unknown) : {});
  } catch {
    return {};
  }
}

function writeAll(value: Record<string, PendingCheckout>) {
  const key = scopeKey();
  if (!key) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the backend still holds the order; the buyer can
    // find it under My Orders.
  }
}

export function readPendingCheckout(cartItemId: string): PendingCheckout | null {
  return readAll()[cartItemId] ?? null;
}

export function listPendingCheckouts(): PendingCheckout[] {
  return Object.values(readAll());
}

export function savePendingCheckout(entry: PendingCheckout) {
  if (!isPendingEntry(entry)) return;
  writeAll({ ...readAll(), [entry.cartItemId]: entry });
}

/** Removes the entry and its idempotency key, so a retry starts a new attempt. */
export function clearPendingCheckout(cartItemId: string) {
  const all = readAll();
  const entry = all[cartItemId];
  if (entry) clearCheckoutAttemptKeyValue(entry.request.idempotencyKey);
  delete all[cartItemId];
  writeAll(all);
}

/** Removes and returns the entry for an order (after paid/expired/cancelled). */
export function takePendingCheckoutByOrder(orderId: number): PendingCheckout | null {
  const all = readAll();
  const entry = Object.values(all).find((e) => e.orderId === orderId) ?? null;
  if (entry) {
    clearCheckoutAttemptKeyValue(entry.request.idempotencyKey);
    delete all[entry.cartItemId];
    writeAll(all);
  }
  return entry;
}
