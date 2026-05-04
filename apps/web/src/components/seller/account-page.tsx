"use client";

import { useEffect, useState } from "react";
import { Check, X, Eye, EyeOff, Minus, Plus, BellOff, ChevronUp, ChevronDown } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { useDemoUser } from "@/lib/demo-user";

type Tab = "profile" | "security" | "preferences";

interface ProfileData {
  firstName: string;
  lastName: string;
  workPhone: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  avatar: string | null;
}

const initialProfile: ProfileData = {
  firstName: "John",
  lastName: "Senna",
  workPhone: "01234567890",
  workEmail: "johnsenna@mail.com",
  jobTitle: "CEO & Founder",
  department: "",
  avatar: null,
};

/* ─── Modal shell ─── */
function Modal({ title, onClose, children, footer, wide }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full ${wide ? "max-w-[760px]" : "max-w-[560px]"} overflow-hidden rounded-2xl bg-white`}
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid #F0F0F0" }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Name ─── */
function EditNameModal({ profile, onSave, onClose }: {
  profile: ProfileData;
  onSave: (firstName: string, lastName: string) => void;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);

  return (
    <Modal
      title="Edit name"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => onSave(firstName, lastName)}>
            Save Change
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Last name"
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
    </Modal>
  );
}

/* ─── Edit Sensitive Field (phone/email — needs password) ─── */
function EditSensitiveModal({ title, valueLabel, currentValue, type = "text", onSave, onClose }: {
  title: string;
  valueLabel: string;
  currentValue: string;
  type?: "text" | "tel" | "email";
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentValue);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            disabled={!password.trim()}
            style={!password.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            onClick={() => onSave(value)}
          >
            Save Change
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label={valueLabel}
          id="value"
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="pw" className="text-base font-medium text-neutral-900">
            Password
          </label>
          <div className="relative">
            <input
              id="pw"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-white px-4 py-3 pr-11 text-base text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
              style={{ border: "1px solid #E0E0E0" }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            >
              {showPw ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Edit Plain Field (job title, department) ─── */
function EditPlainModal({ title, label, currentValue, onSave, onClose }: {
  title: string;
  label: string;
  currentValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentValue);

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => onSave(value)}>
            Save Change
          </Button>
        </>
      }
    >
      <Input
        label={label}
        id="value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </Modal>
  );
}

/* ─── Update Photo ─── */
function UpdatePhotoModal({ onSave, onClose }: {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(50);
  // Demo image as placeholder
  const demoImage = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80";

  const scale = 1 + (zoom / 100) * 1.5;

  return (
    <Modal
      title="Update Photo"
      wide
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => onSave(demoImage)}>
            Save Change
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative h-[400px] overflow-hidden rounded-xl bg-neutral-200">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${demoImage})`,
              transform: `scale(${scale})`,
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 size-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
              border: "2px solid white",
            }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-md bg-neutral-900/70 px-3 py-1.5 text-xs font-medium text-white">
              Drag to Repotition
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Minus className="size-5 text-neutral-500" />
          <input
            type="range"
            min={0}
            max={100}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="flex-1 accent-green-700"
          />
          <Plus className="size-5 text-neutral-500" />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Profile row with verified badge ─── */
function ProfileRow({ label, value, verified, onEdit }: {
  label: string;
  value: React.ReactNode;
  verified?: boolean;
  onEdit: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-6 px-6 py-5"
      style={{ borderBottom: "1px solid #F0F0F0" }}
    >
      <span className="w-[200px] shrink-0 text-sm text-neutral-700">{label}</span>
      <div className="flex flex-1 items-center gap-2 text-sm text-neutral-900">
        {value || <span className="text-neutral-400">Enter Data</span>}
        {verified && (
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-green-500">
            <Check className="size-3 text-white" strokeWidth={3} />
          </span>
        )}
      </div>
      <button
        onClick={onEdit}
        className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
      >
        Edit
      </button>
    </div>
  );
}

/* ─── Profile tab ─── */
function ProfileTab({ profile, setProfile }: {
  profile: ProfileData;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData>>;
}) {
  const [modal, setModal] = useState<
    | null
    | "name"
    | "phone"
    | "email"
    | "jobTitle"
    | "department"
    | "photo"
  >(null);
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  return (
    <>
      <div
        className="flex items-center justify-between gap-6 px-6 py-6"
        style={{ borderBottom: "1px solid #F0F0F0" }}
      >
        <div className="flex flex-1 items-center">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="size-16 rounded-full object-cover" />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-neutral-200 text-2xl font-semibold text-neutral-500">
              {profile.firstName.charAt(0).toUpperCase() || "A"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-5">
          <button
            onClick={() => setProfile((p) => ({ ...p, avatar: null }))}
            className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
          >
            Delete
          </button>
          <button
            onClick={() => setModal("photo")}
            className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
          >
            Update
          </button>
        </div>
      </div>
      <ProfileRow label="Name" value={fullName} onEdit={() => setModal("name")} />
      <ProfileRow label="Work Phone" value={profile.workPhone} verified onEdit={() => setModal("phone")} />
      <ProfileRow label="Work Email" value={profile.workEmail} verified onEdit={() => setModal("email")} />
      <ProfileRow label="Job Title" value={profile.jobTitle} onEdit={() => setModal("jobTitle")} />
      <div className="flex items-center justify-between gap-6 px-6 py-5">
        <span className="w-[200px] shrink-0 text-sm text-neutral-700">Department</span>
        <div className="flex-1 text-sm text-neutral-900">
          {profile.department || <span className="text-neutral-400">Enter Data</span>}
        </div>
        <button
          onClick={() => setModal("department")}
          className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
        >
          Edit
        </button>
      </div>

      {modal === "name" && (
        <EditNameModal
          profile={profile}
          onClose={() => setModal(null)}
          onSave={(firstName, lastName) => {
            setProfile((p) => ({ ...p, firstName, lastName }));
            setModal(null);
          }}
        />
      )}
      {modal === "phone" && (
        <EditSensitiveModal
          title="Edit Work Phone"
          valueLabel="Phone number"
          currentValue={profile.workPhone}
          type="tel"
          onClose={() => setModal(null)}
          onSave={(workPhone) => {
            setProfile((p) => ({ ...p, workPhone }));
            setModal(null);
          }}
        />
      )}
      {modal === "email" && (
        <EditSensitiveModal
          title="Edit Work Email"
          valueLabel="Email address"
          currentValue={profile.workEmail}
          type="email"
          onClose={() => setModal(null)}
          onSave={(workEmail) => {
            setProfile((p) => ({ ...p, workEmail }));
            setModal(null);
          }}
        />
      )}
      {modal === "jobTitle" && (
        <EditPlainModal
          title="Edit Job Title"
          label="Job Title"
          currentValue={profile.jobTitle}
          onClose={() => setModal(null)}
          onSave={(jobTitle) => {
            setProfile((p) => ({ ...p, jobTitle }));
            setModal(null);
          }}
        />
      )}
      {modal === "department" && (
        <EditPlainModal
          title="Edit Department"
          label="Department"
          currentValue={profile.department}
          onClose={() => setModal(null)}
          onSave={(department) => {
            setProfile((p) => ({ ...p, department }));
            setModal(null);
          }}
        />
      )}
      {modal === "photo" && (
        <UpdatePhotoModal
          onClose={() => setModal(null)}
          onSave={(avatar) => {
            setProfile((p) => ({ ...p, avatar }));
            setModal(null);
          }}
        />
      )}
    </>
  );
}

/* ─── Security tab ─── */
interface DeviceSession {
  id: string;
  device: string;
  client: string;
  location: string;
  when: string;
}

const initialSessions: DeviceSession[] = [
  { id: "s1", device: "OS X 10.15.7", client: "Chrome", location: "Baton Rouge", when: "January 10, 2025 10:24 AM" },
  { id: "s2", device: "Mobile App", client: "LSU Health", location: "Baton Rouge", when: "January 10, 2025 10:24 AM" },
  { id: "s3", device: "OS X 10.15.7", client: "Firefox", location: "Baton Rouge", when: "January 10, 2025 10:24 AM" },
];

function SecurityTab() {
  const [sessions, setSessions] = useState<DeviceSession[]>(initialSessions);
  const [showPwModal, setShowPwModal] = useState(false);

  return (
    <div className="px-6 py-6">
      {/* Login section */}
      <h3 className="text-lg font-bold text-neutral-900">Login</h3>
      <div className="mt-4 flex items-center justify-between gap-6 py-4">
        <span className="w-[200px] shrink-0 text-sm text-neutral-900">Password</span>
        <div className="flex-1 text-sm italic text-neutral-500">Last updated 12 days ago</div>
        <button
          onClick={() => setShowPwModal(true)}
          className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
        >
          Update
        </button>
      </div>

      {/* Device history */}
      <h3 className="mt-8 text-lg font-bold text-neutral-900">Device History</h3>
      <div className="mt-4 flex gap-6 py-4">
        <span className="w-[200px] shrink-0 text-sm text-neutral-900">History</span>
        <div className="flex flex-1 flex-col">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-6 py-4"
              style={{ borderBottom: i < sessions.length - 1 ? "1px solid #F0F0F0" : "none" }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm text-neutral-900">
                  {s.device} · {s.client}
                </span>
                <span className="text-xs text-neutral-500">
                  {s.location} · {s.when}
                </span>
              </div>
              <button
                onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}
                className="shrink-0 text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Log Out Device
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <span className="py-4 text-sm text-neutral-500">No active devices.</span>
          )}
        </div>
      </div>

      {showPwModal && (
        <UpdatePasswordModal onClose={() => setShowPwModal(false)} />
      )}
    </div>
  );
}

function UpdatePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const valid = current.trim() && next.trim() && next === confirm;

  return (
    <Modal
      title="Update Password"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            disabled={!valid}
            style={!valid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            onClick={onClose}
          >
            Save Change
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Current password" id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="New password" id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <Input label="Confirm new password" id="conf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ─── Preferences tab ─── */
type Channel = "email" | "mobile" | "inApp";

interface NotifItem {
  id: string;
  label: string;
  prefs: Record<Channel, boolean>;
}

interface NotifCategory {
  id: string;
  title: string;
  description: string;
  items: NotifItem[];
}

const initialCategories: NotifCategory[] = [
  {
    id: "orders",
    title: "Orders & quotes",
    description:
      "Activity around buyer interest and active orders for your listings.",
    items: [
      { id: "i1", label: "New buyer inquiry on a listing", prefs: { email: true, mobile: false, inApp: true } },
      { id: "i2", label: "Quote awaiting your approval", prefs: { email: true, mobile: true, inApp: false } },
      { id: "i3", label: "Buyer requested a change to your quote", prefs: { email: false, mobile: true, inApp: false } },
      { id: "i4", label: "Order placed against one of your listings", prefs: { email: true, mobile: true, inApp: true } },
      { id: "i5", label: "Order cancelled", prefs: { email: true, mobile: false, inApp: false } },
    ],
  },
  {
    id: "payments",
    title: "Payments & escrow",
    description:
      "Funds movement and payouts tied to your transactions.",
    items: [
      { id: "j1", label: "Escrow funded by buyer", prefs: { email: true, mobile: false, inApp: true } },
      { id: "j2", label: "Escrow released to your account", prefs: { email: false, mobile: true, inApp: true } },
      { id: "j3", label: "Dispute opened on a transaction", prefs: { email: true, mobile: true, inApp: false } },
    ],
  },
  {
    id: "listings",
    title: "Listings & verification",
    description:
      "Updates on the status of your listings and seller account.",
    items: [
      { id: "k1", label: "Listing approved by EcoGlobe team", prefs: { email: false, mobile: false, inApp: true } },
      { id: "k2", label: "SDS or certification needs attention", prefs: { email: true, mobile: false, inApp: false } },
    ],
  },
];

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex size-5 items-center justify-center rounded transition-colors ${
        checked ? "bg-neutral-900" : "bg-white hover:bg-neutral-50"
      }`}
      style={{ border: checked ? "1px solid #090909" : "1px solid #D0D0D0" }}
    >
      {checked && <Check className="size-3.5 text-white" strokeWidth={3} />}
    </button>
  );
}

function NotificationCategoryCard({ category, onToggle }: {
  category: NotifCategory;
  onToggle: (itemId: string, channel: Channel) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-6 px-6 pt-5 pb-4 text-left"
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-neutral-900">{category.title}</h3>
          <p className="text-sm text-neutral-500">{category.description}</p>
        </div>
        {expanded ? (
          <ChevronUp className="mt-1 size-5 shrink-0 text-neutral-500" />
        ) : (
          <ChevronDown className="mt-1 size-5 shrink-0 text-neutral-500" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-2">
          <div
            className="grid items-center gap-4 py-3 text-sm font-semibold text-neutral-900"
            style={{ gridTemplateColumns: "1fr 80px 80px 80px", borderTop: "1px solid #F0F0F0" }}
          >
            <span>Question</span>
            <span className="text-center">Email</span>
            <span className="text-center">Mobile</span>
            <span className="text-center">In-App</span>
          </div>
          {category.items.map((item, i) => (
            <div
              key={item.id}
              className="grid items-center gap-4 py-3.5 text-sm text-neutral-700"
              style={{
                gridTemplateColumns: "1fr 80px 80px 80px",
                borderTop: i === 0 ? "1px solid #F0F0F0" : "1px solid #F8F8F8",
              }}
            >
              <span>{item.label}</span>
              <div className="flex justify-center">
                <Checkbox checked={item.prefs.email} onChange={() => onToggle(item.id, "email")} />
              </div>
              <div className="flex justify-center">
                <Checkbox checked={item.prefs.mobile} onChange={() => onToggle(item.id, "mobile")} />
              </div>
              <div className="flex justify-center">
                <Checkbox checked={item.prefs.inApp} onChange={() => onToggle(item.id, "inApp")} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreferencesTab() {
  const [categories, setCategories] = useState<NotifCategory[]>(initialCategories);
  const [paused, setPaused] = useState(false);

  const toggle = (catId: string) => (itemId: string, channel: Channel) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              items: c.items.map((it) =>
                it.id !== itemId ? it : { ...it, prefs: { ...it.prefs, [channel]: !it.prefs[channel] } },
              ),
            },
      ),
    );
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      {/* Don't disturb */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-neutral-900">Don&apos;t disturb</h3>
          <p className="text-sm text-neutral-500">
            Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          className="flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          style={{ border: "1px solid #090909" }}
        >
          <BellOff className="size-4" />
          {paused ? "Resume Notifications" : "Pause Notifications"}
        </button>
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-neutral-900">Notification Preferences</h3>
        {categories.map((c) => (
          <NotificationCategoryCard key={c.id} category={c} onToggle={toggle(c.id)} />
        ))}
      </div>
    </div>
  );
}

export function SellerAccountPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const user = useDemoUser();
  const [profile, setProfile] = useState<ProfileData>(initialProfile);

  useEffect(() => {
    if (!user) return;
    const [first, ...rest] = user.name.trim().split(" ");
    setProfile((p) => ({
      ...p,
      firstName: first || p.firstName,
      lastName: rest.join(" ") || p.lastName,
      workEmail: user.email || p.workEmail,
    }));
  }, [user]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Login & Security" },
    { id: "preferences", label: "Preferences" },
  ];

  return (
    <SellerLayout title="My Account">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
        <h1 className="px-1 text-2xl font-bold text-neutral-900">My Account</h1>

        <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          {/* Tabs */}
          <div
            className="flex items-center gap-8 px-6 pt-5"
            style={{ borderBottom: "1px solid #F0F0F0" }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative pb-4 text-sm font-medium transition-colors ${
                  tab === t.id ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-neutral-900" />
                )}
              </button>
            ))}
          </div>

          {tab === "profile" && <ProfileTab profile={profile} setProfile={setProfile} />}
          {tab === "security" && <SecurityTab />}
          {tab === "preferences" && <PreferencesTab />}
        </div>
      </div>
    </SellerLayout>
  );
}
