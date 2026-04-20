"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, MoreHorizontal, X, Settings2, Trash2, Pencil } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";

interface Role {
  id: string;
  name: string;
  userCount: number;
  status: "Active" | "Inactive";
  permissions: Record<string, { views: string[]; actions: string[] }>;
  users: { name: string; lastActivity: string; status: string }[];
}

const modules = ["Transactions", "Products", "Sellers", "Buyers", "Escrow", "Accounting", "Inventory", "Files", "Reports"];
const viewOptions = ["Product detail", "Transaction", "Example action", "Example action", "Example action", "Example action", "Example action", "Example action"];
const actionOptions = ["Create", "Read", "Update", "Delete", "Approve", "Decline", "Block", "Unblock", "Export", "Import", "Share", "Print"];

const STORAGE_KEY = "ecoglobe_roles";

const defaultRoles: Role[] = [
  { id: "1", name: "Super Admin", userCount: 1, status: "Active", permissions: { Products: { views: ["Product detail", "Transaction", "Example action"], actions: ["Create", "Read", "Approve"] } }, users: [{ name: "Zackary Romayne", lastActivity: "Today", status: "Active" }] },
  { id: "2", name: "Admin", userCount: 2, status: "Active", permissions: { Products: { views: ["Product detail", "Transaction", "Example action"], actions: ["Create", "Read", "Approve"] } }, users: [{ name: "Jaquan Stroman", lastActivity: "Today", status: "Active" }, { name: "Eusebio Castello", lastActivity: "Today", status: "Active" }] },
  { id: "3", name: "Finance", userCount: 3, status: "Active", permissions: { Transactions: { views: ["Transaction"], actions: ["Read", "Export"] } }, users: [] },
  { id: "4", name: "Compliance", userCount: 7, status: "Active", permissions: {}, users: [] },
  { id: "5", name: "Support", userCount: 3, status: "Active", permissions: {}, users: [] },
  { id: "6", name: "Analyst", userCount: 4, status: "Active", permissions: {}, users: [] },
  { id: "7", name: "Marketing", userCount: 12, status: "Active", permissions: {}, users: [] },
];

function getRoles(): Role[] {
  if (typeof window === "undefined") return defaultRoles;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : defaultRoles;
}
function saveRoles(roles: Role[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(roles)); }

/* ─── Add Role Modal ─── */
function AddRoleModal({ onSave, onClose }: { onSave: (r: Role) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[500px] rounded-2xl bg-white p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">Add Role</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="size-5" /></button>
        </div>
        <div className="flex flex-col gap-5">
          <Input label="Role name" id="roleName" placeholder="Input field" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 rounded accent-neutral-900" /> Active
            </label>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="md" disabled={!name.trim()} style={!name.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined} onClick={() => { onSave({ id: Date.now().toString(), name, userCount: 0, status: active ? "Active" : "Inactive", permissions: {}, users: [] }); onClose(); }}>
                Add Role
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Permissions Drawer ─── */
function RoleDetailDrawer({ role, onUpdate, onClose }: { role: Role; onUpdate: (r: Role) => void; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"permissions" | "users">("permissions");
  const [activeModule, setActiveModule] = useState("Products");
  const [perms, setPerms] = useState(role.permissions);

  const modulePerms = perms[activeModule] ?? { views: [], actions: [] };

  const togglePerm = (type: "views" | "actions", item: string) => {
    const current = modulePerms[type];
    const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
    const newPerms = { ...perms, [activeModule]: { ...modulePerms, [type]: updated } };
    setPerms(newPerms);
    onUpdate({ ...role, permissions: newPerms });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[780px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 bg-white px-6 pt-5 pb-0" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3"><h2 className="text-xl font-bold text-neutral-900">{role.name}</h2><span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">{role.status}</span></div>
              <p className="text-sm text-neutral-500">Last update 12/12/2026</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><MoreHorizontal className="size-5 text-neutral-500" /></button>
              <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
            </div>
          </div>
          <div className="flex gap-6">
            {(["permissions", "users"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={`pb-3 text-sm font-medium capitalize ${activeTab === t ? "text-neutral-900 border-b-2 border-neutral-900" : "text-neutral-400"}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "permissions" ? (
            <div className="flex gap-6">
              {/* Module list */}
              <div className="w-[200px] shrink-0 rounded-xl p-4" style={{ border: "1px solid #F0F0F0" }}>
                <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold text-neutral-900">System</h4><Settings2 className="size-4 text-neutral-400" /></div>
                <div className="flex flex-col gap-0.5">
                  {modules.map((m) => (
                    <button key={m} onClick={() => setActiveModule(m)} className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${activeModule === m ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}`}>{m}</button>
                  ))}
                </div>
              </div>
              {/* Views */}
              <div className="flex-1">
                <h4 className="mb-4 text-sm font-bold text-neutral-900">Views</h4>
                <div className="flex flex-col gap-3">
                  {viewOptions.map((v, i) => (
                    <label key={`${v}-${i}`} className="flex items-center gap-2 text-sm text-neutral-700">
                      <input type="checkbox" checked={modulePerms.views.includes(v)} onChange={() => togglePerm("views", v)} className="size-4 rounded accent-neutral-900" />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              {/* Actions */}
              <div className="flex-1">
                <h4 className="mb-4 text-sm font-bold text-neutral-900">Actions</h4>
                <div className="flex flex-col gap-3">
                  {actionOptions.map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm text-neutral-700">
                      <input type="checkbox" checked={modulePerms.actions.includes(a)} onChange={() => togglePerm("actions", a)} className="size-4 rounded accent-neutral-900" />
                      {a}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr style={{ borderBottom: "1px solid #F0F0F0" }}><th className="pb-3 text-left text-sm font-medium text-neutral-500">Buyer Name</th><th className="pb-3 text-left text-sm font-medium text-neutral-500">Last activity</th><th className="pb-3 text-left text-sm font-medium text-neutral-500">Status</th><th className="pb-3"></th></tr></thead>
              <tbody>
                {role.users.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-sm text-neutral-400">No users assigned to this role</td></tr>
                ) : role.users.map((u, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F8F8F8" }}>
                    <td className="py-3.5"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">{u.name[0]}</div><span className="text-sm text-neutral-900">{u.name}</span></div></td>
                    <td className="py-3.5 text-sm text-neutral-700">{u.lastActivity}</td>
                    <td className="py-3.5"><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">{u.status}</span></td>
                    <td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Row Actions ─── */
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button>
      {open && (<><div className="fixed inset-0 z-20" onClick={() => setOpen(false)} /><div className="absolute right-0 top-6 z-30 w-[140px] rounded-lg bg-white py-1" style={{ border: "1px solid #F0F0F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}><button onClick={() => { onEdit(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"><Pencil className="size-3.5" /> Edit</button><button onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="size-3.5" /> Delete</button></div></>)}
    </div>
  );
}

/* ─── Main Page ─── */
export function SettingsRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => { setRoles(getRoles()); }, []);

  const filtered = roles.filter((r) => !searchQuery.trim() || r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAddRole = (role: Role) => {
    const updated = [...roles, role];
    setRoles(updated);
    saveRoles(updated);
  };

  const handleUpdateRole = (role: Role) => {
    const updated = roles.map((r) => (r.id === role.id ? role : r));
    setRoles(updated);
    saveRoles(updated);
    setSelectedRole(role);
  };

  const handleDelete = (id: string) => {
    const updated = roles.filter((r) => r.id !== id);
    setRoles(updated);
    saveRoles(updated);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Roles</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
            <Search className="size-4 text-neutral-400" />
            <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
          </div>
          <button className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700" style={{ border: "1px solid #F0F0F0" }}>
            <SlidersHorizontal className="size-4" /> Filters
          </button>
          <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>Add System User</Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <th className="pb-3 text-sm font-medium text-neutral-500">Role name</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Number of user</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Permissions</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((role) => (
              <tr key={role.id} style={{ borderBottom: "1px solid #F8F8F8" }} className="hover:bg-neutral-50">
                <td className="py-4 text-sm text-neutral-900">{role.name}</td>
                <td className="py-4 text-sm text-neutral-700">{role.userCount}</td>
                <td className="py-4">
                  <button onClick={() => setSelectedRole(role)} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-700" style={{ border: "1px solid #E0E0E0" }}>
                    <Settings2 className="size-3.5" /> Permissions
                  </button>
                </td>
                <td className="py-4"><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">{role.status}</span></td>
                <td className="py-4"><RowActions onEdit={() => setSelectedRole(role)} onDelete={() => handleDelete(role.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && <AddRoleModal onSave={handleAddRole} onClose={() => setShowAddModal(false)} />}
      {selectedRole && <RoleDetailDrawer role={selectedRole} onUpdate={handleUpdateRole} onClose={() => setSelectedRole(null)} />}
    </div>
  );
}
