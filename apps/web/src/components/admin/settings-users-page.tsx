"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, X, Trash2, Pencil } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";

interface SystemUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  status: "Active" | "Inactive";
  lastActivity: string;
}

const defaultUsers: SystemUser[] = [
  { id: "1", firstName: "Zackary", lastName: "Romayne", email: "zack@eco.com", phone: "555-0101", address: "Baton Rouge, LA", role: "Super Admin", status: "Active", lastActivity: "Today" },
  { id: "2", firstName: "Jaquan", lastName: "Stroman", email: "jaquan@eco.com", phone: "555-0102", address: "Austin, TX", role: "Admin", status: "Active", lastActivity: "Today" },
  { id: "3", firstName: "Eusebio", lastName: "Castello", email: "eusebio@eco.com", phone: "555-0103", address: "Miami, FL", role: "Admin", status: "Active", lastActivity: "Today" },
  { id: "4", firstName: "Jayson", lastName: "Zboncak", email: "jayson@eco.com", phone: "555-0104", address: "Denver, CO", role: "Finance", status: "Active", lastActivity: "Today" },
  { id: "5", firstName: "Doug", lastName: "Crona", email: "doug@eco.com", phone: "555-0105", address: "Seattle, WA", role: "Finance", status: "Active", lastActivity: "Today" },
  { id: "6", firstName: "Eli", lastName: "Considine", email: "eli@eco.com", phone: "555-0106", address: "Chicago, IL", role: "Compliance", status: "Active", lastActivity: "Today" },
  { id: "7", firstName: "Tod", lastName: "Crist", email: "tod@eco.com", phone: "555-0107", address: "Boston, MA", role: "Compliance", status: "Active", lastActivity: "Yesterday" },
  { id: "8", firstName: "Cyril", lastName: "Abshire", email: "cyril@eco.com", phone: "555-0108", address: "Orlando, FL", role: "Support", status: "Active", lastActivity: "12/12/2026" },
  { id: "9", firstName: "Shea", lastName: "Trantow", email: "shea@eco.com", phone: "555-0109", address: "LA, CA", role: "Analyst", status: "Active", lastActivity: "12/12/2026" },
  { id: "10", firstName: "Wiley", lastName: "Jast", email: "wiley@eco.com", phone: "555-0110", address: "Portland, OR", role: "Analyst", status: "Active", lastActivity: "12/12/2026" },
];

const STORAGE_KEY = "ecoglobe_system_users";

function getUsers(): SystemUser[] {
  if (typeof window === "undefined") return defaultUsers;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : defaultUsers;
}

function saveUsers(users: SystemUser[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

const roleOptions = [
  { value: "Super Admin", label: "Super Admin" },
  { value: "Admin", label: "Admin" },
  { value: "Finance", label: "Finance" },
  { value: "Compliance", label: "Compliance" },
  { value: "Support", label: "Support" },
  { value: "Analyst", label: "Analyst" },
  { value: "Marketing", label: "Marketing" },
];

/* ─── Add/Edit User Modal ─── */
function UserModal({ user, onSave, onClose }: { user?: SystemUser; onSave: (u: SystemUser) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
    role: user?.role ?? "",
    active: user?.status !== "Inactive",
  });
  const up = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));
  const isValid = form.firstName.trim() && form.lastName.trim() && form.email.trim();

  const handleSubmit = () => {
    onSave({
      id: user?.id ?? Date.now().toString(),
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      role: form.role || "Admin",
      status: form.active ? "Active" : "Inactive",
      lastActivity: user?.lastActivity ?? "Today",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[680px] rounded-2xl bg-white p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">{user ? "Edit System User" : "Add System User"}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="size-5" /></button>
        </div>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" id="fn" placeholder="Input field" value={form.firstName} onChange={(e) => up("firstName", e.target.value)} />
            <Input label="Last name" id="ln" placeholder="Input field" value={form.lastName} onChange={(e) => up("lastName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" id="em" type="email" placeholder="Input field" value={form.email} onChange={(e) => up("email", e.target.value)} />
            <Input label="Phone number" id="ph" type="tel" placeholder="Input field" value={form.phone} onChange={(e) => up("phone", e.target.value)} />
          </div>
          <Input label="Address" id="addr" placeholder="Input field" value={form.address} onChange={(e) => up("address", e.target.value)} />
          <Select label="Role" id="role" options={[{ value: "", label: "-- Choose --" }, ...roleOptions]} value={form.role} onChange={(e) => up("role", e.target.value)} />
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <input type="checkbox" checked={form.active} onChange={(e) => up("active", e.target.checked)} className="size-4 rounded accent-neutral-900" /> Active
            </label>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="md" disabled={!isValid} style={!isValid ? { opacity: 0.4, cursor: "not-allowed" } : undefined} onClick={handleSubmit}>
                {user ? "Save Changes" : "Add System User"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Row Action Menu ─── */
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-30 w-[140px] rounded-lg bg-white py-1" style={{ border: "1px solid #F0F0F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <button onClick={() => { onEdit(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"><Pencil className="size-3.5" /> Edit</button>
            <button onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="size-3.5" /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export function SettingsUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setUsers(getUsers()); }, []);

  const filtered = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleSave = (user: SystemUser) => {
    const updated = editingUser ? users.map((u) => (u.id === user.id ? user : u)) : [...users, user];
    setUsers(updated);
    saveUsers(updated);
    setEditingUser(undefined);
  };

  const handleDelete = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
  };

  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">System Users</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
            <Search className="size-4 text-neutral-400" />
            <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
          </div>
          <button className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700" style={{ border: "1px solid #F0F0F0" }}>
            <SlidersHorizontal className="size-4" /> Filters
          </button>
          <Button variant="primary" size="md" onClick={() => { setEditingUser(undefined); setShowModal(true); }}>Add System User</Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <th className="pb-3 text-sm font-medium text-neutral-500">Buyer Name</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Role</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Last activity</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #F8F8F8" }} className="hover:bg-neutral-50">
                <td className="py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
                      {user.firstName[0]}
                    </div>
                    <span className="text-sm text-neutral-900">{user.firstName} {user.lastName}</span>
                  </div>
                </td>
                <td className="py-3.5 text-sm text-neutral-700">{user.role}</td>
                <td className="py-3.5 text-sm text-neutral-700">{user.lastActivity}</td>
                <td className="py-3.5">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${user.status === "Active" ? "bg-green-50 text-green-600" : "bg-neutral-100 text-neutral-500"}`}>{user.status}</span>
                </td>
                <td className="py-3.5">
                  <RowActions onEdit={() => { setEditingUser(user); setShowModal(true); }} onDelete={() => handleDelete(user.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #F0F0F0" }}>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4" /></button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`flex size-8 items-center justify-center rounded text-sm ${p === currentPage ? "bg-neutral-900 font-medium text-white" : "text-neutral-500 hover:bg-neutral-100"}`} onClick={() => setCurrentPage(p)}>{p}</button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4" /></button>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{ border: "1px solid #E0E0E0" }}>10 / page <ChevronDown className="size-3.5" /></button>
      </div>

      {showModal && <UserModal user={editingUser} onSave={handleSave} onClose={() => { setShowModal(false); setEditingUser(undefined); }} />}
    </div>
  );
}
