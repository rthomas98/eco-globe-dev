"use client";

import { NotificationPreferencesPanel } from "@/components/notifications/notification-preferences-panel";

export function NotificationsPreferencesPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="max-w-[900px] px-4 py-5 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-neutral-900">Notification Preferences</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Choose which alerts you receive on each channel. Preferences are saved to your account.
        </p>
        <NotificationPreferencesPanel />
      </div>
    </div>
  );
}
