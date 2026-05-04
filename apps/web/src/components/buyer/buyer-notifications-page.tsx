"use client";

import { useState } from "react";
import { MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { BuyerLayout } from "./buyer-layout";
import {
  sellerNotifications,
  type NotificationGroup,
} from "../seller/notifications-data";

const groupOrder: NotificationGroup[] = [
  "Earlier",
  "Last 7 days",
  "Last 30 days",
];

export function BuyerNotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");

  const visible =
    tab === "unread"
      ? sellerNotifications.filter((n) => n.unread)
      : sellerNotifications;

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-8 py-8">
          <div className="flex items-center justify-between px-1">
            <h1 className="text-2xl font-bold text-neutral-900">
              Notifications
            </h1>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
              style={{ border: "1px solid #090909" }}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </button>
          </div>

          <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
            <div className="px-6 pt-6 pb-2">
              <div className="flex w-fit gap-1 rounded-full bg-neutral-100 p-1">
                <button
                  onClick={() => setTab("all")}
                  className={`rounded-full px-6 py-1.5 text-sm font-medium ${
                    tab === "all"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTab("unread")}
                  className={`rounded-full px-6 py-1.5 text-sm font-medium ${
                    tab === "unread"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500"
                  }`}
                >
                  Unread
                </button>
              </div>
            </div>

            <div className="px-6 pb-4">
              {groupOrder.map((group) => {
                const items = visible.filter((n) => n.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mt-4">
                    <h3 className="mb-1 text-sm font-bold text-neutral-900">
                      {group}
                    </h3>
                    {items.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-4 py-4"
                        style={{ borderBottom: "1px solid #F8F8F8" }}
                      >
                        <div className="flex w-2 items-start pt-3">
                          {n.unread && (
                            <span className="size-1.5 rounded-full bg-green-600" />
                          )}
                        </div>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                          <n.icon className="size-4 text-neutral-500" />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm text-neutral-700">{n.message}</p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {n.source} · {n.time}
                          </p>
                        </div>
                        <button className="shrink-0 pt-2 text-neutral-400 hover:text-neutral-700">
                          <MoreHorizontal className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
              {visible.length === 0 && (
                <p className="py-16 text-center text-sm text-neutral-500">
                  No notifications
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
