"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";

const STORAGE_KEY = "ecoglobe_account";

interface Profile { name: string; phone: string; email: string; jobTitle: string; department: string; }

const defaultProfile: Profile = { name: "Katarina Jenkins", phone: "01234567890", email: "katarinajenkins@mail.com", jobTitle: "CEO & Founder", department: "" };

function getProfile(): Profile {
  if (typeof window === "undefined") return defaultProfile;
  const s = localStorage.getItem(STORAGE_KEY);
  return s ? JSON.parse(s) : defaultProfile;
}
function saveProfile(p: Profile) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

/* ─── Edit Modal ─── */
function EditModal({ title, children, onClose, onSave }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[560px] rounded-2xl bg-white p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="size-5" /></button>
        </div>
        <div className="flex flex-col gap-5">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={onSave}>Save Change</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Tab ─── */
function ProfileTab({ profile, onUpdate }: { profile: Profile; onUpdate: (p: Profile) => void }) {
  const [editField, setEditField] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");

  const openEdit = (field: string) => {
    const parts = profile.name.split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    setPhone(profile.phone);
    setEmail(profile.email);
    setJobTitle(profile.jobTitle);
    setDepartment(profile.department);
    setPassword("");
    setEditField(field);
  };

  const handleSave = () => {
    let updated = { ...profile };
    if (editField === "name") updated.name = `${firstName} ${lastName}`.trim();
    if (editField === "phone") updated.phone = phone;
    if (editField === "email") updated.email = email;
    if (editField === "jobTitle") updated.jobTitle = jobTitle;
    if (editField === "department") updated.department = department;
    onUpdate(updated);
    setEditField(null);
  };

  const rows = [
    { label: "Name", value: profile.name, field: "name" },
    { label: "Work Phone", value: profile.phone, field: "phone", verified: true },
    { label: "Work Email", value: profile.email, field: "email", verified: true },
    { label: "Job Title", value: profile.jobTitle, field: "jobTitle" },
    { label: "Department", value: profile.department || "Enter Data", field: "department", placeholder: true },
  ];

  return (
    <div>
      {/* Avatar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex size-16 items-center justify-center rounded-full bg-neutral-200 text-2xl font-semibold text-neutral-500">
          {profile.name[0]}
        </div>
        <div className="flex gap-4">
          <button className="text-sm font-medium text-neutral-500 underline">Delete</button>
          <button className="text-sm font-medium text-neutral-900 underline">Update</button>
        </div>
      </div>

      {/* Profile fields */}
      <div className="flex flex-col">
        {rows.map((row) => (
          <div key={row.field} className="flex items-center justify-between py-5" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <div className="flex items-center gap-8">
              <span className="w-32 text-sm font-medium text-neutral-900">{row.label}</span>
              <span className={`text-sm ${row.placeholder ? "text-neutral-400" : "text-neutral-700"}`}>
                {row.value}
                {row.verified && <CheckCircle2 className="ml-2 inline size-4 text-green-500" />}
              </span>
            </div>
            <button onClick={() => openEdit(row.field)} className="text-sm font-medium text-neutral-900 underline">Edit</button>
          </div>
        ))}
      </div>

      {/* Edit Modals */}
      {editField === "name" && (
        <EditModal title="Edit name" onClose={() => setEditField(null)} onSave={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Last name" id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </EditModal>
      )}
      {editField === "phone" && (
        <EditModal title="Edit Phone Number" onClose={() => setEditField(null)} onSave={handleSave}>
          <Input label="Phone number" id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Password" id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </EditModal>
      )}
      {editField === "email" && (
        <EditModal title="Edit Email Address" onClose={() => setEditField(null)} onSave={handleSave}>
          <Input label="Email address" id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </EditModal>
      )}
      {editField === "jobTitle" && (
        <EditModal title="Job title" onClose={() => setEditField(null)} onSave={handleSave}>
          <Input label="Job title" id="jt" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </EditModal>
      )}
      {editField === "department" && (
        <EditModal title="Department" onClose={() => setEditField(null)} onSave={handleSave}>
          <Input label="Department" id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </EditModal>
      )}
    </div>
  );
}

/* ─── Login & Security Tab ─── */
function LoginSecurityTab() {
  const devices = [
    { name: "OS X 10.15.7 · Chrome", location: "Baton Rouge · January 10, 2025 10:24 AM" },
    { name: "Mobile App · LSU Health", location: "Baton Rouge · January 10, 2025 10:24 AM" },
    { name: "OS X 10.15.7 · Firefox", location: "Baton Rouge · January 10, 2025 10:24 AM" },
  ];

  return (
    <div>
      <h3 className="mb-4 text-lg font-bold text-neutral-900">Login</h3>
      <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
        <span className="text-sm font-medium text-neutral-900">Password</span>
        <span className="text-sm text-neutral-400">Last updated 12 days ago</span>
        <button className="text-sm font-medium text-neutral-900 underline">Update</button>
      </div>

      <h3 className="mb-4 mt-8 text-lg font-bold text-neutral-900">Device History</h3>
      <div className="flex flex-col">
        {devices.map((d, i) => (
          <div key={i} className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <div className="flex items-center gap-8">
              <span className="w-20 text-sm font-medium text-neutral-900">{i === 0 ? "History" : ""}</span>
              <div>
                <p className="text-sm font-medium text-neutral-900">{d.name}</p>
                <p className="text-xs text-neutral-500">{d.location}</p>
              </div>
            </div>
            <button className="text-sm font-medium text-neutral-900 underline">Log Out Device</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Account Page ─── */
export function AccountPage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  useEffect(() => { setProfile(getProfile()); }, []);

  const handleUpdate = (p: Profile) => {
    setProfile(p);
    saveProfile(p);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="max-w-[900px] px-6 py-5">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900">My Account</h1>
        <div className="mb-6 flex gap-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
          {([{ key: "profile" as const, label: "Profile" }, { key: "security" as const, label: "Login & Security" }]).map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`pb-3 text-sm font-medium ${activeTab === tab.key ? "text-neutral-900 border-b-2 border-neutral-900" : "text-neutral-400"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "profile" && <ProfileTab profile={profile} onUpdate={handleUpdate} />}
        {activeTab === "security" && <LoginSecurityTab />}
      </div>
    </div>
  );
}
