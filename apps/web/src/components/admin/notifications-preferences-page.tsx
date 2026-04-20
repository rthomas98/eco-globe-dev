"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Button } from "@eco-globe/ui";

const STORAGE_KEY = "ecoglobe_notif_prefs";

interface NotifItem { label: string; email: boolean; mobile: boolean; inApp: boolean; }
interface Category { title: string; description: string; items: NotifItem[]; }

const defaultCategories: Category[] = [
  { title: "Category 1 here", description: "You will receive important informations orem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod", items: [
    { label: "Example detail notification here", email: true, mobile: false, inApp: true },
    { label: "Example detail notification here", email: true, mobile: true, inApp: false },
    { label: "Example detail notification lorem ipsum dolor sit amet", email: false, mobile: true, inApp: false },
    { label: "Lorem ipsum detail notification here", email: true, mobile: true, inApp: true },
    { label: "Example detail notification here", email: true, mobile: false, inApp: false },
  ]},
  { title: "Category 2 here", description: "You will receive important informations orem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod", items: [
    { label: "Example detail notification here", email: true, mobile: false, inApp: true },
    { label: "Example detail notification here", email: true, mobile: true, inApp: false },
    { label: "Example detail notification lorem ipsum dolor sit amet", email: false, mobile: true, inApp: false },
    { label: "Lorem ipsum detail notification here", email: true, mobile: true, inApp: true },
    { label: "Example detail notification here", email: true, mobile: false, inApp: false },
  ]},
  { title: "Category 3 here", description: "You will receive important informations orem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod", items: [
    { label: "Example detail notification here", email: true, mobile: false, inApp: true },
    { label: "Example detail notification here", email: true, mobile: true, inApp: false },
    { label: "Example detail notification lorem ipsum dolor sit amet", email: false, mobile: true, inApp: false },
    { label: "Lorem ipsum detail notification here", email: true, mobile: true, inApp: true },
    { label: "Example detail notification here", email: true, mobile: false, inApp: false },
  ]},
];

function getPrefs(): Category[] {
  if (typeof window === "undefined") return defaultCategories;
  const s = localStorage.getItem(STORAGE_KEY);
  return s ? JSON.parse(s) : defaultCategories;
}

export function NotificationsPreferencesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [paused, setPaused] = useState(false);

  useEffect(() => { setCategories(getPrefs()); }, []);

  const toggleExpand = (i: number) => {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  };

  const togglePref = (catIdx: number, itemIdx: number, channel: "email" | "mobile" | "inApp") => {
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
            <p className="mt-1 text-sm text-neutral-500">Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
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
                          <th className="pb-3 text-center text-sm font-medium text-neutral-500 w-20">Mobile</th>
                          <th className="pb-3 text-center text-sm font-medium text-neutral-500 w-20">In-App</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((item, itemIdx) => (
                          <tr key={itemIdx} style={{ borderBottom: "1px solid #F8F8F8" }}>
                            <td className="py-4 text-sm text-neutral-700">{item.label}</td>
                            <td className="py-4 text-center">
                              <input type="checkbox" checked={item.email} onChange={() => togglePref(catIdx, itemIdx, "email")} className="size-4 rounded accent-neutral-900" />
                            </td>
                            <td className="py-4 text-center">
                              <input type="checkbox" checked={item.mobile} onChange={() => togglePref(catIdx, itemIdx, "mobile")} className="size-4 rounded accent-neutral-900" />
                            </td>
                            <td className="py-4 text-center">
                              <input type="checkbox" checked={item.inApp} onChange={() => togglePref(catIdx, itemIdx, "inApp")} className="size-4 rounded accent-neutral-900" />
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
