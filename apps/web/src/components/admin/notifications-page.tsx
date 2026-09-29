"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info, MoreHorizontal, Filter, CheckCheck, Settings, Mail, MessageSquareText, MonitorDot } from "lucide-react";
import type { AdminNotification } from "./notifications-data";
import {
  markLiveNotificationRead,
  useLiveNotifications,
} from "@/components/notifications/use-live-notifications";
import {
  notificationGroupOrder,
  type NotificationCategory,
  type NotificationChannel,
  type PortalNotification,
} from "@/components/notifications/notification-model";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/data-state";
import { LabNotificationsSection } from "./lab-notifications-section";

type Tab = "all" | "unread";
type Category = "All" | NotificationCategory;

const CATEGORIES: Category[] = ["All", "Orders", "Payments", "Compliance", "Sustainability", "System"];

const CATEGORY_TONE: Record<NotificationCategory, { bg: string; fg: string }> = {
  Compliance: { bg: "#FEF3C7", fg: "#92400E" },
  Orders: { bg: "#DBEAFE", fg: "#1D4ED8" },
  Payments: { bg: "#DCFCE7", fg: "#166534" },
  Sustainability: { bg: "#D1FAE5", fg: "#047857" },
  System: { bg: "#F1F5F9", fg: "#334155" },
};

const HREF_BY_CATEGORY: Record<NotificationCategory, string> = {
  Orders: "/admin/sales",
  Payments: "/admin/accounting/escrow",
  Sustainability: "/admin/reports/carbon",
  Compliance: "/admin/kyc",
  System: "/admin/settings/notifications",
};

function toAdminNotification(n: PortalNotification): AdminNotification {
  return {
    id: n.id,
    group: n.group,
    msg: typeof n.message === "string" ? n.message : n.detail,
    source: n.source,
    time: n.time,
    unread: n.unread,
    category: n.category,
    href: HREF_BY_CATEGORY[n.category],
    channels: n.channels,
    detail: n.detail,
  };
}

export function AdminNotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<Category>("All");
  const [readIds, setReadIds] = useState<string[]>([]);
  const [markError, setMarkError] = useState<string | null>(null);
  const live = useLiveNotifications();

  const isUnread = (item: AdminNotification) => item.unread && !readIds.includes(item.id);
  const all = useMemo(() => live.items.map(toAdminNotification), [live.items]);

  const filtered = notificationGroupOrder
    .map((group) => ({
      group,
      items: all.filter((i) => {
        if (i.group !== group) return false;
        if (tab === "unread" && !isUnread(i)) return false;
        if (category !== "All" && i.category !== category) return false;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);

  const totalUnread = all.filter((i) => isUnread(i)).length;

  // Rows turn read only after the backend confirms each change.
  const markRead = async (items: AdminNotification[]) => {
    setMarkError(null);
    const results = await Promise.all(
      items.map((item) => markLiveNotificationRead(item.id).then((saved) => (saved ? item.id : null))),
    );
    const saved = results.filter((id): id is string => id !== null);
    setReadIds((current) => [...new Set([...current, ...saved])]);
    if (saved.length < items.length) setMarkError("Some notifications could not be marked as read.");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-6 pb-16 sm:px-8 sm:pt-8">
        {/* Heading */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Notifications</h1>
            <p className="mt-1 text-sm text-neutral-500">
              In-app notifications recorded for your account
              {live.status === "ready" ? ` — ${totalUnread} unread.` : "."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={totalUnread === 0}
              onClick={() => void markRead(all.filter((i) => isUnread(i)))}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
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

        <LabNotificationsSection />

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

        {markError && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {markError}
          </p>
        )}

        {live.status !== "ready" || filtered.length === 0 ? (
          <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
            {live.status === "loading" && <LoadingState label="Loading notifications…" />}
            {live.status === "error" && (
              <ErrorState message={live.error ?? "Notifications could not be loaded."} onRetry={live.reload} />
            )}
            {live.status === "signed-out" && (
              <EmptyState title="Sign in to see notifications" />
            )}
            {live.status === "ready" && (
              <EmptyState
                title={all.length === 0 ? "No notifications yet" : "No notifications match."}
                description={
                  all.length === 0
                    ? "Platform notifications for your account will appear here."
                    : "Try clearing your filters or switching tabs."
                }
              />
            )}
          </div>
        ) : (
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
                      onOpen={() => {
                        if (isUnread(item)) void markRead([item]);
                      }}
                      isLast={i === group.items.length - 1}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
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
  const tone = CATEGORY_TONE[item.category];
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
          {item.source} · {item.time}
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
