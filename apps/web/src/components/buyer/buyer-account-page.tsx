"use client";

import { useState } from "react";
import {
  User,
  MapPin,
  CreditCard,
  Bell,
  Shield,
  Plus,
  Trash2,
  Star,
} from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import { useDemoUser } from "@/lib/demo-user";

type Tab = "profile" | "addresses" | "payment" | "notifications" | "security";

const TABS: Array<{ id: Tab; label: string; icon: typeof User }> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payment", label: "Payment methods", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

export function BuyerAccountPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const user = useDemoUser();

  return (
    <BuyerLayout>
      <div className="px-8 py-8">
        <h1 className="text-3xl font-bold text-neutral-900">Account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your profile, delivery addresses, and payment methods.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Tab nav */}
          <nav className="lg:col-span-1">
            <div className="rounded-xl bg-white p-2" style={{ border: "1px solid #F0F0F0" }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    tab === t.id
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <t.icon className="size-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Body */}
          <div className="lg:col-span-3">
            {tab === "profile" && <ProfileTab user={user} />}
            {tab === "addresses" && <AddressesTab />}
            {tab === "payment" && <PaymentTab />}
            {tab === "notifications" && <NotificationsTab />}
            {tab === "security" && <SecurityTab />}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-900">{label}</label>
      {children}
    </div>
  );
}

function ProfileTab({ user }: { user: ReturnType<typeof useDemoUser> }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  return (
    <Card title="Profile">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-20 items-center justify-center rounded-full bg-neutral-900 text-2xl font-bold text-white">
          {(name || "U").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-base font-semibold text-neutral-900">{name || "—"}</p>
          <p className="text-sm text-neutral-500">{user?.companySize ?? "—"} · {user?.industry ?? "—"}</p>
          <button className="mt-1 text-sm font-medium text-neutral-900 underline">
            Replace photo
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            label=""
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <Input
            label=""
            id="account-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Company">
          <Input label="" id="account-company" defaultValue="AgriCorp Solutions" />
        </Field>
        <Field label="Role">
          <Input label="" id="account-role" defaultValue={user?.userRole ?? "Buyer"} />
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" size="md">
          Save changes
        </Button>
      </div>
    </Card>
  );
}

function AddressesTab() {
  const user = useDemoUser();
  const facilities = user?.facilities ?? [];
  const [primaryId, setPrimaryId] = useState<string | undefined>(facilities[0]?.id);

  return (
    <Card
      title="Saved addresses"
      action={
        <Button variant="secondary" size="md">
          <Plus className="size-4" />
          Add address
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {facilities.length === 0 && (
          <p className="text-sm text-neutral-500">No saved addresses yet.</p>
        )}
        {facilities.map((f) => (
          <div
            key={f.id}
            className="flex items-start justify-between gap-3 rounded-xl px-4 py-3"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 text-neutral-500" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-900">{f.label}</p>
                  {primaryId === f.id && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#DCFCE7", color: "#166534" }}>
                      <Star className="size-3" />
                      Primary
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">{f.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {primaryId !== f.id && (
                <button
                  onClick={() => setPrimaryId(f.id)}
                  className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
                >
                  Make primary
                </button>
              )}
              <button className="text-sm font-medium text-neutral-700 hover:text-neutral-900 ml-3">
                Edit
              </button>
              <button title="Delete" className="ml-1 flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface PaymentMethod {
  id: string;
  brand: "Visa" | "Mastercard" | "ACH";
  last4: string;
  expires?: string;
  primary?: boolean;
}

const SEED_PAYMENT: PaymentMethod[] = [
  { id: "pm_1", brand: "Visa", last4: "4242", expires: "08/27", primary: true },
  { id: "pm_2", brand: "Mastercard", last4: "5454", expires: "01/26" },
  { id: "pm_3", brand: "ACH", last4: "8123" },
];

function PaymentTab() {
  const [methods, setMethods] = useState(SEED_PAYMENT);

  const makePrimary = (id: string) =>
    setMethods((prev) =>
      prev.map((m) => ({ ...m, primary: m.id === id })),
    );
  const remove = (id: string) =>
    setMethods((prev) => prev.filter((m) => m.id !== id));

  return (
    <Card
      title="Payment methods"
      action={
        <Button variant="secondary" size="md">
          <Plus className="size-4" />
          Add method
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {methods.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-12 items-center justify-center rounded-md bg-neutral-100 text-[10px] font-bold uppercase tracking-wide text-neutral-700">
                {m.brand}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {m.brand === "ACH" ? "Bank account" : "Card"} ending in {m.last4}
                </p>
                <p className="text-xs text-neutral-500">
                  {m.expires ? `Expires ${m.expires}` : "Wire / ACH"}
                  {m.primary && " · Primary"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!m.primary && (
                <button
                  onClick={() => makePrimary(m.id)}
                  className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
                >
                  Make primary
                </button>
              )}
              <button
                onClick={() => remove(m.id)}
                title="Remove"
                className="ml-2 flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NotificationsTab() {
  const channels = [
    { id: "order-updates", label: "Order updates", desc: "Shipping, delivery, escrow events." },
    { id: "messages", label: "Messages from sellers", desc: "Quotes, replies, dispute updates." },
    { id: "new-listings", label: "New matching listings", desc: "Listings that match your saved searches." },
    { id: "newsletters", label: "Marketplace newsletter", desc: "Monthly recap and feature highlights." },
  ];
  return (
    <Card title="Notification preferences">
      <div className="flex flex-col gap-3">
        {channels.map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between gap-3 rounded-xl px-4 py-3"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div>
              <p className="text-sm font-semibold text-neutral-900">{c.label}</p>
              <p className="text-xs text-neutral-500">{c.desc}</p>
            </div>
            <div className="flex gap-3 text-xs text-neutral-700">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" defaultChecked className="size-3.5 accent-neutral-900" /> Email
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" className="size-3.5 accent-neutral-900" /> SMS
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" defaultChecked className="size-3.5 accent-neutral-900" /> In-app
              </label>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SecurityTab() {
  return (
    <div className="flex flex-col gap-6">
      <Card title="Password">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Current password">
            <Input label="" id="cur-pw" type="password" />
          </Field>
          <div />
          <Field label="New password">
            <Input label="" id="new-pw" type="password" />
          </Field>
          <Field label="Confirm new password">
            <Input label="" id="conf-pw" type="password" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="primary" size="md">
            Update password
          </Button>
        </div>
      </Card>
      <Card title="Two-factor authentication">
        <p className="text-sm text-neutral-700">
          Add a second layer of security to your account. We&apos;ll send a 6-digit code via authenticator app.
        </p>
        <div className="mt-4">
          <Button variant="secondary" size="md">
            Enable 2FA
          </Button>
        </div>
      </Card>
      <Card title="Active sessions">
        <div className="flex flex-col gap-2 text-sm text-neutral-700">
          <p>
            <strong>This browser</strong> · Houston, TX · last active just now
          </p>
          <p>iPhone 15 · Houston, TX · 3 hours ago</p>
        </div>
        <button className="mt-3 text-sm font-medium text-red-600 hover:underline">
          Sign out everywhere
        </button>
      </Card>
    </div>
  );
}
