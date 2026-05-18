"use client";

import { useState } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { SellerLayout } from "./seller-layout";
import {
  sellerNotifications,
  type NotificationGroup,
  type SellerNotification,
} from "./notifications-data";
import { NotificationDetailDrawer } from "./notification-detail-drawer";

const groupOrder: NotificationGroup[] = ["Earlier", "Last 7 days", "Last 30 days"];

export function SellerNotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [selected, setSelected] = useState<SellerNotification | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);

  const isUnread = (notification: SellerNotification) =>
    notification.unread && !readIds.includes(notification.id);

  const openNotification = (notification: SellerNotification) => {
    setSelected(notification);
    if (notification.unread) {
      setReadIds((current) =>
        current.includes(notification.id)
          ? current
          : [...current, notification.id],
      );
    }
  };

  const visible =
    tab === "unread" ? sellerNotifications.filter((n) => isUnread(n)) : sellerNotifications;

  return (
    <SellerLayout title="Notifications">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
        <div className="flex items-center justify-between px-1">
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
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
                  tab === "all" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTab("unread")}
                className={`rounded-full px-6 py-1.5 text-sm font-medium ${
                  tab === "unread" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
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
                  <h3 className="mb-1 text-sm font-bold text-neutral-900">{group}</h3>
                  {items.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className="flex w-full items-start gap-4 py-4 text-left transition-colors hover:bg-neutral-50"
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                    >
                      <div className="flex w-2 items-start pt-3">
                        {isUnread(n) && <span className="size-1.5 rounded-full bg-green-600" />}
                      </div>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                        <n.icon className="size-4 text-neutral-500" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-neutral-700">{n.message}</p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {n.source} &middot; {n.time}
                        </p>
                      </div>
                      <ChevronRight className="mt-3 size-4 shrink-0 text-neutral-300" />
                    </button>
                  ))}
                </div>
              );
            })}
            {visible.length === 0 && (
              <p className="py-16 text-center text-sm text-neutral-500">No notifications</p>
            )}
          </div>
        </div>
      </div>
      <NotificationDetailDrawer
        notification={selected}
        portal="seller"
        read={selected ? !isUnread(selected) : true}
        onClose={() => setSelected(null)}
      />
    </SellerLayout>
  );
}
