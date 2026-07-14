"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  Lock,
  MapPin,
  UserCircle,
} from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import {
  buildDemoUser,
  type DemoUser,
  useDemoUser,
  writeDemoUser,
} from "@/lib/demo-user";
import { notificationPreferenceCategories } from "@/components/notifications/notifications-demo-data";
import { BuyerLayout } from "./buyer-layout";

type Tab = "profile" | "company" | "security" | "preferences";

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
}

const defaultProfile: ProfileForm = {
  name: "Joanna Bell",
  email: "demo.buyer@ecoglobe.com",
  phone: "225-555-0198",
  jobTitle: "Sustainability Manager",
  department: "Strategic Sourcing",
};

type PreferenceChannel = "email" | "sms" | "inApp";

interface BuyerPreferenceItem {
  id: string;
  label: string;
  description: string;
  channels: Record<PreferenceChannel, boolean>;
}

interface BuyerPreferenceCategory {
  id: string;
  title: string;
  description: string;
  items: BuyerPreferenceItem[];
}

const buyerPreferenceCategories: BuyerPreferenceCategory[] =
  notificationPreferenceCategories.map((category) => ({
    id: category.id,
    title: category.title,
    description: category.description,
    items: category.items.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      channels: { ...item.defaultChannels },
    })),
  }));

function FieldRow({
  label,
  value,
  verified,
}: {
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderBottom: "1px solid #F0F0F0" }}
    >
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <span className="flex items-center gap-2 text-sm text-neutral-700">
        {value}
        {verified && <CheckCircle2 className="size-4 text-green-600" />}
      </span>
    </div>
  );
}

function ProfileTab({
  form,
  setForm,
  onSave,
}: {
  form: ProfileForm;
  setForm: (next: ProfileForm) => void;
  onSave: () => void;
}) {
  const update = (key: keyof ProfileForm, value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <section
        className="rounded-2xl bg-neutral-50 p-5"
        style={{ border: "1px solid #F0F0F0" }}
      >
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-rose-200 text-2xl font-bold text-rose-700">
          {form.name.charAt(0) || "J"}
        </div>
        <h2 className="text-lg font-bold text-neutral-900">{form.name}</h2>
        <p className="mt-1 text-sm text-neutral-600">{form.email}</p>
        <p className="mt-4 text-sm text-neutral-700">
          Buyer account profile used for orders, quote approvals, and carbon
          calculator saved locations.
        </p>
      </section>

      <section
        className="rounded-2xl bg-white p-5"
        style={{ border: "1px solid #F0F0F0" }}
      >
        <div className="mb-5 flex items-center gap-2">
          <UserCircle className="size-5 text-neutral-700" />
          <h2 className="text-lg font-bold text-neutral-900">Profile details</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="buyer-account-name"
            label="Full name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <Input
            id="buyer-account-email"
            label="Work email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <Input
            id="buyer-account-phone"
            label="Work phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
          <Input
            id="buyer-account-title"
            label="Job title"
            value={form.jobTitle}
            onChange={(e) => update("jobTitle", e.target.value)}
          />
          <Input
            id="buyer-account-department"
            label="Department"
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="primary" size="md" onClick={onSave}>
            Save Profile
          </Button>
        </div>
      </section>
    </div>
  );
}

function CompanyTab({ user }: { user: DemoUser }) {
  const facilities = user.facilities ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section
        className="rounded-2xl bg-white p-5"
        style={{ border: "1px solid #F0F0F0" }}
      >
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="size-5 text-neutral-700" />
          <h2 className="text-lg font-bold text-neutral-900">Buyer company</h2>
        </div>
        <FieldRow label="Company name" value="AgriCorp Solutions" />
        <FieldRow label="Industry" value={user.industry ?? "Carbon Black"} />
        <FieldRow label="Company size" value={user.companySize ?? "Big"} />
        <FieldRow label="Decision role" value={user.userRole ?? "Sustainability Manager"} />
        <FieldRow label="Account status" value="Verified buyer" verified />
      </section>

      <section
        className="rounded-2xl bg-white p-5"
        style={{ border: "1px solid #F0F0F0" }}
      >
        <div className="mb-5 flex items-center gap-2">
          <MapPin className="size-5 text-neutral-700" />
          <h2 className="text-lg font-bold text-neutral-900">Saved locations</h2>
        </div>
        <div className="flex flex-col gap-3">
          {facilities.map((facility) => (
            <div
              key={facility.id}
              className="rounded-xl bg-neutral-50 p-4"
              style={{ border: "1px solid #F0F0F0" }}
            >
              <p className="text-sm font-bold text-neutral-900">{facility.label}</p>
              <p className="mt-1 text-sm text-neutral-600">{facility.address}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SecurityTab() {
  return (
    <section
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <div className="mb-5 flex items-center gap-2">
        <Lock className="size-5 text-neutral-700" />
        <h2 className="text-lg font-bold text-neutral-900">Login & security</h2>
      </div>
      <FieldRow label="Password" value="Last updated 12 days ago" />
      <FieldRow label="Two-factor authentication" value="Not enabled" />
      <FieldRow label="Current session" value="MacOS · Chrome · Baton Rouge" />
      <FieldRow label="Last sign in" value="May 18, 2026 08:45 AM" />
      <div className="mt-5">
        <Button variant="secondary" size="md">
          Review Security Settings
        </Button>
      </div>
    </section>
  );
}

function PreferencesTab() {
  const [categories, setCategories] = useState<BuyerPreferenceCategory[]>(
    buyerPreferenceCategories,
  );
  const [paused, setPaused] = useState(false);

  const toggleChannel = (
    categoryId: string,
    itemId: string,
    channel: PreferenceChannel,
  ) => {
    setCategories((current) =>
      current.map((category) =>
        category.id !== categoryId
          ? category
          : {
              ...category,
              items: category.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      channels: {
                        ...item.channels,
                        [channel]: !item.channels[channel],
                      },
                    },
              ),
            },
      ),
    );
  };

  return (
    <section
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 size-5 text-neutral-700" />
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Notification preferences</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Control order, escrow, sustainability, and compliance alerts across
              email, SMS, and in-app notifications.
            </p>
          </div>
        </div>
        <Button
          variant={paused ? "primary" : "secondary"}
          size="sm"
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "Resume Alerts" : "Pause Non-critical Alerts"}
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="rounded-xl bg-neutral-50 p-4"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div className="mb-3">
              <h3 className="text-sm font-bold text-neutral-900">{category.title}</h3>
              <p className="mt-1 text-xs text-neutral-500">{category.description}</p>
            </div>
            <div className="flex flex-col">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 py-3 text-sm sm:grid-cols-[1fr_72px_72px_72px] sm:items-center"
                  style={{ borderTop: "1px solid #F0F0F0" }}
                >
                  <div>
                    <p className="font-semibold text-neutral-900">{item.label}</p>
                    <p className="mt-1 text-xs text-neutral-500">{item.description}</p>
                  </div>
                  {(["email", "sms", "inApp"] as const).map((channel) => (
                    <label
                      key={channel}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-neutral-700 sm:justify-center"
                      style={{ border: "1px solid #E7E7E7" }}
                    >
                      <span className="sm:hidden">
                        {channel === "inApp" ? "In-app" : channel.toUpperCase()}
                      </span>
                      <input
                        type="checkbox"
                        checked={item.channels[channel]}
                        onChange={() => toggleChannel(category.id, item.id, channel)}
                        className="size-4 accent-neutral-900"
                        aria-label={`${item.label} ${channel}`}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BuyerAccountPage() {
  const demoUser = useDemoUser();
  const user = demoUser ?? buildDemoUser("buyer");
  const [tab, setTab] = useState<Tab>("profile");
  const [form, setForm] = useState<ProfileForm>(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user.name || current.name,
      email: user.email || current.email,
      jobTitle: user.userRole || current.jobTitle,
    }));
  }, [user.email, user.name, user.userRole]);

  const handleSave = () => {
    writeDemoUser({
      ...user,
      name: form.name,
      email: form.email,
      userRole: form.jobTitle as DemoUser["userRole"],
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "company", label: "Company" },
    { id: "security", label: "Login & Security" },
    { id: "preferences", label: "Preferences" },
  ];

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col overflow-y-auto bg-neutral-50 px-8 py-6">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">My Account</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Manage your buyer profile, saved locations, security, and notifications.
              </p>
            </div>
            {saved && (
              <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
                Profile saved
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
            <div
              className="flex flex-wrap items-center gap-8 px-6 pt-5"
              style={{ borderBottom: "1px solid #F0F0F0" }}
            >
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`relative pb-4 text-sm font-medium transition-colors ${
                    tab === item.id
                      ? "text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {item.label}
                  {tab === item.id && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-neutral-900" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "profile" && (
                <ProfileTab form={form} setForm={setForm} onSave={handleSave} />
              )}
              {tab === "company" && <CompanyTab user={user} />}
              {tab === "security" && <SecurityTab />}
              {tab === "preferences" && <PreferencesTab />}
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
