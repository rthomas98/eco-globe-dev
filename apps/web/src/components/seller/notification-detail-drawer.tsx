"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, X } from "lucide-react";
import type { SellerNotification } from "./notifications-data";

export type NotificationPortal = "buyer" | "seller";

interface NotificationDetailDrawerProps {
  notification: SellerNotification | null;
  portal: NotificationPortal;
  read: boolean;
  onClose: () => void;
}

export function NotificationDetailDrawer({
  notification,
  portal,
  read,
  onClose,
}: NotificationDetailDrawerProps) {
  if (!notification) return null;

  const Icon = notification.icon;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Dismiss notification details backdrop"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-[440px] flex-col overflow-y-auto bg-white shadow-2xl"
        aria-label="Notification details"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
              Notification details
            </p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">
              {notification.source} update
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
          <div className="rounded-2xl bg-neutral-50 p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white">
                <Icon className="size-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {notification.source}
                </p>
                <p className="text-xs text-neutral-500">{notification.group}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-neutral-800">{notification.message}</p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-900">What this means</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {notification.detail}
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl bg-white p-4" style={{ border: "1px solid #F0F0F0" }}>
            <div className="flex items-center gap-3">
              <Clock3 className="size-4 text-neutral-400" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Received
                </p>
                <p className="text-sm font-semibold text-neutral-800">
                  {notification.time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-4 text-green-600" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Status
                </p>
                <p className="text-sm font-semibold text-neutral-800">
                  {read ? "Read" : "Unread"}
                </p>
              </div>
            </div>
          </div>

          <Link
            href={notification.actionHref[portal]}
            className="mt-auto flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            {notification.actionLabel}
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
