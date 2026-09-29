"use client";

import { useState } from "react";
import {
  fetchNotificationPreferences,
  setNotificationPreference,
  type ApiNotificationPreference,
} from "@/lib/api-account";
import { describeBackendError } from "@/lib/backend-client";
import { useDemoUser } from "@/lib/demo-user";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

/** Preference granularity the backend stores: one row per (category, channel). */
const CATEGORIES = [
  { code: "orders", title: "Orders", description: "Order placement, confirmation, and cancellation." },
  { code: "payments", title: "Payments", description: "Escrow funding, release, refund, and payout events." },
  { code: "logistics", title: "Logistics", description: "Shipment, pickup, and delivery updates." },
  { code: "compliance", title: "Compliance", description: "Verification, document, and dispute deadlines." },
  { code: "sustainability", title: "Sustainability", description: "Carbon and reporting milestones." },
] as const;

// Only in-app delivery exists for these alerts today, so only it is offered.
const CHANNELS = [{ code: "in_app", label: "In-app" }] as const;

function isEnabled(
  prefs: ApiNotificationPreference[],
  userId: number,
  category: string,
  channel: string,
) {
  const row = prefs.find(
    (p) =>
      p.userId === userId &&
      p.notificationCategoryCode === category &&
      p.notificationChannelCode === channel,
  );
  // No saved row means the platform default: enabled.
  return row ? row.enabled : true;
}

/**
 * Saved notification preferences for the signed-in user. A switch changes
 * only after the backend saves it; failures leave it unchanged and say so.
 */
export function NotificationPreferencesPanel() {
  const user = useDemoUser();
  const prefs = useBackendData(
    fetchNotificationPreferences,
    [user?.id],
    "Notification preferences could not be loaded.",
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user?.id) {
    return <p className="text-sm text-neutral-500">Sign in to manage notification preferences.</p>;
  }
  const userId = user.id;

  const toggle = async (category: string, channel: string, next: boolean) => {
    const key = `${category}:${channel}`;
    setBusyKey(key);
    setError(null);
    try {
      await setNotificationPreference(userId, category, channel, next);
      prefs.reload();
    } catch (err) {
      setError(describeBackendError(err, "That preference was not saved."));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
        These alerts are delivered in-app. Email and SMS delivery for marketplace alerts is not
        available yet. Account emails such as sign-up and password reset are sent separately.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <DataBoundary state={prefs} loadingLabel="Loading preferences…" empty={{ title: "" }}>
        {(rows) => (
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #F0F0F0" }}>
            <table className="w-full min-w-[360px]">
              <thead>
                <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <th className="px-5 py-3 text-sm font-medium text-neutral-500">Topic</th>
                  {CHANNELS.map((c) => (
                    <th key={c.code} className="px-3 py-3 text-center text-sm font-medium text-neutral-500">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((category) => (
                  <tr key={category.code} style={{ borderBottom: "1px solid #F8F8F8" }}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-neutral-900">{category.title}</p>
                      <p className="text-xs text-neutral-500">{category.description}</p>
                    </td>
                    {CHANNELS.map((channel) => {
                      const on = isEnabled(rows, userId, category.code, channel.code);
                      return (
                        <td key={channel.code} className="px-3 py-4 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${category.title} ${channel.label}`}
                            checked={on}
                            disabled={busyKey !== null}
                            onChange={() => void toggle(category.code, channel.code, !on)}
                            className="size-4 accent-neutral-900 disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataBoundary>
    </div>
  );
}
