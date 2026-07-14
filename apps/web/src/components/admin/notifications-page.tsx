"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info, MoreHorizontal, Filter, CheckCheck, Settings, Mail, MessageSquareText, MonitorDot } from "lucide-react";
import {
  adminNotificationGroups,
  type AdminNotification,
} from "./notifications-data";
import type { NotificationChannel } from "@/components/notifications/notifications-demo-data";

type Tab = "all" | "unread";
type Category =
  | "All"
  | "Approvals"
  | "Compliance"
  | "Transactions"
  | "Disputes"
  | "System"
  | "Orders"
  | "Payments"
  | "Sustainability";

const CATEGORIES: Category[] = [
  "All",
  "Approvals",
  "Compliance",
  "Transactions",
  "Disputes",
  "Orders",
  "Payments",
  "Sustainability",
  "System",
];

const CATEGORY_TONE: Record<Exclude<Category, "All">, { bg: string; fg: string }> = {
  Approvals: { bg: "#E0F2FE", fg: "#075985" },
  Compliance: { bg: "#FEF3C7", fg: "#92400E" },
  Transactions: { bg: "#DCFCE7", fg: "#166534" },
  Disputes: { bg: "#FEE2E2", fg: "#991B1B" },
  Orders: { bg: "#DBEAFE", fg: "#1D4ED8" },
  Payments: { bg: "#DCFCE7", fg: "#166534" },
  Sustainability: { bg: "#D1FAE5", fg: "#047857" },
  System: { bg: "#F1F5F9", fg: "#334155" },
};

export function AdminNotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<Category>("All");
  const [readIds, setReadIds] = useState<string[]>([]);

  const isUnread = (item: AdminNotification) =>
    item.unread && !readIds.includes(item.id);

  const filtered = useMemo(() => {
    return adminNotificationGroups
      .map((g) => ({
        group: g.group,
        items: g.items.filter((i) => {
          if (tab === "unread" && !isUnread(i)) return false;
          if (category !== "All" && i.category !== category) return false;
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [tab, category, readIds]);

  const totalUnread = adminNotificationGroups
    .flatMap((g) => g.items)
    .filter((i) => isUnread(i)).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 pt-8 pb-16">
        {/* Heading */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Notifications</h1>
            <p className="mt-1 text-sm text-neutral-500">
              All platform activity in one place — {totalUnread} unread.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setReadIds(adminNotificationGroups.flatMap((g) => g.items.map((item) => item.id)))
              }
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <CheckCheck className="size-4" />
              Mark all as read
            </button>
            <Link
              href="/admin/settings/notifications"
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <Settings className="size-4" />
              Settings
            </Link>
          </div>
        </div>

        {/* Tabs + category filter */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-full bg-neutral-100 p-1">
            {(["all", "unread"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {t}
                {t === "unread" && totalUnread > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {totalUnread}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-neutral-500" />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    category === c
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                  style={category !== c ? { border: "1px solid #E0E0E0" } : undefined}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="rounded-xl bg-white px-6 py-12 text-center" style={{ border: "1px solid #F0F0F0" }}>
            <p className="text-sm font-medium text-neutral-700">No notifications match.</p>
            <p className="mt-1 text-xs text-neutral-500">Try clearing your filters or switching tabs.</p>
          </div>
        )}

        {/* Groups */}
        <div className="flex flex-col gap-6">
          {filtered.map((group) => (
            <section key={group.group}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                {group.group}
              </h3>
              <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
                {group.items.map((item, i) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    unread={isUnread(item)}
                    onOpen={() =>
                      setReadIds((current) =>
                        current.includes(item.id) ? current : [...current, item.id],
                      )
                    }
                    isLast={i === group.items.length - 1}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  item,
  unread,
  onOpen,
  isLast,
}: {
  item: AdminNotification;
  unread: boolean;
  onOpen: () => void;
  isLast: boolean;
}) {
  const tone = CATEGORY_TONE[item.category as Exclude<Category, "All">];
  const channelIcon: Record<NotificationChannel, React.ComponentType<{ className?: string }>> = {
    email: Mail,
    sms: MessageSquareText,
    inApp: MonitorDot,
  };
  const channelLabel: Record<NotificationChannel, string> = {
    email: "Email",
    sms: "SMS",
    inApp: "In-app",
  };
  const className = `flex items-start gap-3 px-5 py-4 ${item.href ? "hover:bg-neutral-50" : ""}`;
  const style = { borderBottom: isLast ? undefined : "1px solid #F4F4F5" };
  const inner = (
    <>
      <div className="mt-1 flex size-2 shrink-0 items-center justify-center">
        {unread && <span className="size-2 rounded-full bg-red-500" />}
      </div>
      <Info className="mt-0.5 size-5 shrink-0 text-neutral-400" />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {item.category}
          </span>
          <p className={`text-sm ${unread ? "font-semibold text-neutral-900" : "text-neutral-700"}`}>
            {item.msg}
          </p>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          {item.source} · {item.time} · {item.priority} priority
        </p>
        <p className="mt-2 text-xs leading-5 text-neutral-500">{item.detail}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.channels.map((channel) => {
            const ChannelIcon = channelIcon[channel];
            return (
              <span
                key={channel}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600"
              >
                <ChannelIcon className="size-3" />
                {channelLabel[channel]}
              </span>
            );
          })}
        </div>
      </div>
      <span className="shrink-0 text-neutral-400">
        <MoreHorizontal className="size-4" />
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} onClick={onOpen} className={className} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onOpen} className={className} style={style}>
      {inner}
    </button>
  );
}
