"use client";

import { describeBackendError } from "@/lib/backend-client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { readDemoUser, useDemoUser, writeDemoUser } from "@/lib/demo-user";
import { TeamTab } from "@/components/account/team-tab";
import {
  changePassword,
  updateUserName,
} from "@/lib/api-account";
import { NotificationPreferencesPanel } from "@/components/notifications/notification-preferences-panel";

type Tab = "profile" | "team" | "security" | "preferences";

interface ProfileData {
  firstName: string;
  lastName: string;
  workPhone: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  avatar: string | null;
}

// Filled from the signed-in session; never seeded with example people.
const initialProfile: ProfileData = {
  firstName: "",
  lastName: "",
  workPhone: "",
  workEmail: "",
  jobTitle: "",
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
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        <div
          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

/* ─── Edit Plain Field (job title, department) ─── */

/* ─── Update Photo ─── */

/* ─── Profile row with verified badge ─── */
function ProfileRow({ label, value, verified, onEdit }: {
  label: string;
  value: React.ReactNode;
  verified?: boolean;
  onEdit: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
      style={{ borderBottom: "1px solid #F0F0F0" }}
    >
      <span className="w-full text-sm text-neutral-700 sm:w-[200px] sm:shrink-0">{label}</span>
      <div className="flex w-full min-w-0 flex-1 items-center gap-2 break-words text-sm text-neutral-900 sm:w-auto">
        {value || <span className="text-neutral-400">Enter Data</span>}
        {verified && (
          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-green-500">
            <Check className="size-3 text-white" strokeWidth={3} />
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="self-start text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700 sm:self-auto"
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
  const [saveError, setSaveError] = useState<string | null>(null);

  return (
    <>
      <ProfileRow label="Name" value={fullName || "—"} onEdit={() => setModal("name")} />
      <div className="flex flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <span className="w-full text-sm text-neutral-700 sm:w-[200px] sm:shrink-0">Email</span>
        <span className="text-sm text-neutral-900">{profile.workEmail || "—"}</span>
      </div>
      <p className="px-4 pb-5 text-xs text-neutral-500 sm:px-6">
        Your sign-in email cannot be changed here. Contact EcoGlobe to update it.
      </p>
      {saveError && <p role="alert" className="px-4 pb-4 text-sm text-red-700 sm:px-6">{saveError}</p>}

      {modal === "name" && (
        <EditNameModal
          profile={profile}
          onClose={() => setModal(null)}
          onSave={(firstName, lastName) => {
            const fullNameNext = `${firstName} ${lastName}`.trim();
            const session = readDemoUser();
            if (!session?.id || !fullNameNext) return;
            setSaveError(null);
            // The name changes only after the backend saves it.
            void updateUserName(session.id, fullNameNext)
              .then(() => {
                writeDemoUser({ ...session, name: fullNameNext });
                setProfile((p) => ({ ...p, firstName, lastName }));
              })
              .catch((error) => setSaveError(describeBackendError(error, "Your name was not saved.")))
              .finally(() => setModal(null));
          }}
        />
      )}
    </>
  );
}

/* ─── Security tab ─── */


function SecurityTab() {
  const [showPwModal, setShowPwModal] = useState(false);

  return (
    <div className="px-6 py-6">
      {/* Login section */}
      <h3 className="text-lg font-bold text-neutral-900">Login</h3>
      <div className="mt-4 flex items-center justify-between gap-6 py-4">
        <span className="w-[200px] shrink-0 text-sm text-neutral-900">Password</span>
        <div className="flex-1 text-sm text-neutral-500">••••••••</div>
        <button
          onClick={() => setShowPwModal(true)}
          className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
        >
          Update
        </button>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const valid = current.trim() && next.trim() && next === confirm;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await changePassword(current, next);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed.");
    }
    setSaving(false);
  };

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
            disabled={!valid || saving}
            style={!valid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            onClick={() => void save()}
          >
            {saving ? "Saving..." : "Save Change"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
        )}
        <Input label="Current password" id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="New password" id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <Input label="Confirm new password" id="conf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
    </Modal>
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
    { id: "team", label: "Team" },
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
          {tab === "team" && (
            <TeamTab
              companyId={user?.activeCompanyId}
              currentUserId={user?.id}
              operatorRole="seller_operator"
            />
          )}
          {tab === "security" && <SecurityTab />}
          {tab === "preferences" && (
            <div className="px-4 py-6 sm:px-6">
              <NotificationPreferencesPanel />
            </div>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
