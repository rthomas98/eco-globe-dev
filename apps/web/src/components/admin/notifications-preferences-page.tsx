"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { notificationPreferenceCategories } from "@/components/notifications/notifications-demo-data";

const STORAGE_KEY = "ecoglobe_notif_prefs_v2";

interface NotifItem { label: string; description: string; email: boolean; sms: boolean; inApp: boolean; }
interface Category { title: string; description: string; items: NotifItem[]; }

const defaultCategories: Category[] = notificationPreferenceCategories.map((category) => ({
  title: category.title,
  description: category.description,
  items: category.items.map((item) => ({
    label: item.label,
    description: item.description,
    email: item.defaultChannels.email,
    sms: item.defaultChannels.sms,
    inApp: item.defaultChannels.inApp,
  })),
}));

function getPrefs(): Category[] {
  if (typeof window === "undefined") return defaultCategories;
  const s = localStorage.getItem(STORAGE_KEY);
  if (!s) return defaultCategories;
  try {
    const parsed = JSON.parse(s) as Category[];
    return parsed.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({
        ...item,
        description: item.description ?? "",
        sms: item.sms ?? (item as unknown as { mobile?: boolean }).mobile ?? false,
      })),
    }));
  } catch {
    return defaultCategories;
  }
}

export function NotificationsPreferencesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [paused, setPaused] = useState(false);

  useEffect(() => { setCategories(getPrefs()); }, []);

  const toggleExpand = (i: number) => {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  };

  const togglePref = (catIdx: number, itemIdx: number, channel: "email" | "sms" | "inApp") => {
    const updated = categories.map((cat, ci) => ci !== catIdx ? cat : {
      ...cat, items: cat.items.map((item, ii) => ii !== itemIdx ? item : { ...item, [channel]: !item[channel] })
    });
    setCategories(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-6 py-5">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900">Notification Preferences</h1>

        {/* Don't disturb */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Don&apos;t disturb</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Pause non-critical email, SMS, and in-app notifications. High-priority compliance and payment alerts still appear in the admin inbox.
            </p>
          </div>
          <Button
            variant={paused ? "primary" : "secondary"}
            size="md"
            onClick={() => setPaused(!paused)}
            className="shrink-0"
          >
            <Download className="size-4" />
            {paused ? "Resume Notifications" : "Pause Notifications"}
          </Button>
        </div>

        {/* Preferences */}
        <h2 className="mb-4 text-lg font-bold text-neutral-900">Notification Preferences</h2>
        <div className="flex flex-col gap-4">
          {categories.map((cat, catIdx) => {
            const isOpen = expanded.has(catIdx);
            return (
              <div key={catIdx} className="rounded-xl" style={{ border: "1px solid #F0F0F0" }}>
                <button
                  onClick={() => toggleExpand(catIdx)}
                  className="flex w-full items-center justify-between p-5"
                >
                  <div className="text-left">
                    <h3 className="text-base font-bold text-neutral-900">{cat.title}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{cat.description}</p>
                  </div>
                  {isOpen ? <ChevronUp className="size-5 shrink-0 text-neutral-400" /> : <ChevronDown className="size-5 shrink-0 text-neutral-400" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                          <th className="pb-3 text-left text-sm font-medium text-neutral-500">Question</th>
                          <th className="pb-3 text-center text-sm font-medium text-neutral-500 w-20">Email</th>
                          <th className="pb-3 text-center text-sm font-medium text-neutral-500 w-20">SMS</th>
                          <th className="pb-3 text-center text-sm font-medium text-neutral-500 w-20">In-App</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((item, itemIdx) => (
                          <tr key={itemIdx} style={{ borderBottom: "1px solid #F8F8F8" }}>
                            <td className="py-4">
                              <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                              <p className="mt-1 text-xs text-neutral-400">{item.description}</p>
                            </td>
                            <td className="py-4 text-center">
                              <input
                                type="checkbox"
                                checked={item.email}
                                onChange={() => togglePref(catIdx, itemIdx, "email")}
                                className="size-4 rounded accent-neutral-900"
                                aria-label={`${item.label} email`}
                              />
                            </td>
                            <td className="py-4 text-center">
                              <input
                                type="checkbox"
                                checked={item.sms}
                                onChange={() => togglePref(catIdx, itemIdx, "sms")}
                                className="size-4 rounded accent-neutral-900"
                                aria-label={`${item.label} sms`}
                              />
                            </td>
                            <td className="py-4 text-center">
                              <input
                                type="checkbox"
                                checked={item.inApp}
                                onChange={() => togglePref(catIdx, itemIdx, "inApp")}
                                className="size-4 rounded accent-neutral-900"
                                aria-label={`${item.label} in-app`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
