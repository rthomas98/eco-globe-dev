"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import {
  buyerNotifications,
  sellerNotifications,
  type NotificationGroup,
  type SellerNotification,
} from "./notifications-data";
import {
  NotificationDetailDrawer,
  type NotificationPortal,
} from "./notification-detail-drawer";

const groupOrder: NotificationGroup[] = ["Earlier", "Last 7 days", "Last 30 days"];

interface NotificationsPanelProps {
  onClose: () => void;
  seeAllHref?: string;
}

export function NotificationsPanel({
  onClose,
  seeAllHref = "/seller/notifications",
}: NotificationsPanelProps) {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [showMenu, setShowMenu] = useState(false);
  const [selected, setSelected] = useState<SellerNotification | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const portal: NotificationPortal = seeAllHref.startsWith("/buyer")
    ? "buyer"
    : "seller";
  const settingsHref = portal === "buyer" ? "/buyer/account" : "/seller/account";
  const notifications =
    portal === "buyer" ? buyerNotifications : sellerNotifications;

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

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showMenu]);

  const visible =
    tab === "unread" ? notifications.filter((n) => isUnread(n)) : notifications;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative z-10 ml-[240px] flex h-full w-[420px] flex-col overflow-y-auto bg-white shadow-xl"
        style={{ borderRight: "1px solid #F0F0F0" }}
      >
        <div className="sticky top-0 z-10 bg-white px-5 pt-5 pb-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900">Notifications</h2>
            <div className="flex items-center gap-3">
              <Link
                href={seeAllHref}
                onClick={onClose}
                className="text-sm font-semibold text-neutral-900"
              >
                View All
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <MoreHorizontal className="size-5" />
                </button>
                {showMenu && (
                  <div
                    className="absolute right-0 top-8 z-30 w-[200px] rounded-lg bg-white py-1"
                    style={{
                      border: "1px solid #F0F0F0",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setReadIds(notifications.map((n) => n.id));
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      Mark all as read
                    </button>
                    <Link
                      href={seeAllHref}
                      onClick={onClose}
                      className="block w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      View all
                    </Link>
                    <Link
                      href={settingsHref}
                      onClick={onClose}
                      className="block w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      Notification settings
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 rounded-full bg-neutral-100 p-1">
            <button
              onClick={() => setTab("all")}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium ${
                tab === "all" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTab("unread")}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium ${
                tab === "unread" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
              }`}
            >
              Unread
            </button>
          </div>
        </div>
        <div className="flex-1 px-5 pb-5">
          {groupOrder.map((group) => {
            const items = visible.filter((n) => n.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-2">
                <h3 className="mb-1 mt-3 text-sm font-bold text-neutral-900">{group}</h3>
                {items.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className="flex w-full gap-3 py-3 text-left transition-colors hover:bg-neutral-50"
                    style={{ borderBottom: "1px solid #F8F8F8" }}
                  >
                    <div className="flex w-2 items-start pt-2">
                      {isUnread(n) && <span className="size-1.5 rounded-full bg-green-600" />}
                    </div>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                      <n.icon className="size-4 text-neutral-500" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                          {n.category}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                          {n.priority}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-700">{n.message}</p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {n.source} &middot; {n.time}
                      </p>
                    </div>
                    <ChevronRight className="mt-2 size-4 shrink-0 text-neutral-300" />
                  </button>
                ))}
              </div>
            );
          })}
          {visible.length === 0 && (
            <p className="py-12 text-center text-sm text-neutral-500">No notifications</p>
          )}
        </div>
      </div>
      <NotificationDetailDrawer
        notification={selected}
        portal={portal}
        read={selected ? !isUnread(selected) : true}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
