"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch, describeBackendError } from "@/lib/backend-client";
import { portalDate } from "@/lib/api-portal";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

interface ApiUser {
  id: number;
  name: string;
  email: string;
  accountStatusCode: string;
  accountStatusName: string;
  createdAt: string;
  updatedAt: string | null;
}

async function fetchUsers() {
  const body = await apiFetch<{ ok: boolean; users: ApiUser[] }>("/api/users");
  return Array.isArray(body.users) ? body.users : [];
}

const PAGE_SIZE = 10;

/** Accounts recorded in EcoGlobe. Status changes are saved before they show. */
export function SettingsUsersPage() {
  const users = useBackendData(fetchUsers, [], "Users could not be loaded.");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const setStatus = async (user: ApiUser, accountStatusCode: "active" | "suspended") => {
    setBusyId(user.id);
    setActionError(null);
    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ accountStatusCode }),
      });
      users.reload();
    } catch (error) {
      setActionError(describeBackendError(error, `The status for ${user.name} was not saved.`));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">System Users</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Accounts registered in EcoGlobe. Company roles are managed by each company&apos;s team
            settings; platform role assignment is not available from this screen yet.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-full bg-neutral-50 px-4 py-2 sm:flex-none" style={{ border: "1px solid #F0F0F0" }}>
            <Search className="size-4 text-neutral-400" />
            <input
              type="search"
              aria-label="Search users"
              placeholder="Search name or email"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 sm:w-40 sm:flex-none"
            />
          </div>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mx-4 mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
          {actionError}
        </p>
      )}

      <DataBoundary
        state={users}
        loadingLabel="Loading users…"
        isEmpty={(rows) => rows.length === 0}
        empty={{ title: "No users yet" }}
      >
        {(rows) => {
          const q = searchQuery.trim().toLowerCase();
          const filtered = q
            ? rows.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q))
            : rows;
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const page = Math.min(currentPage, totalPages);
          const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
          return (
            <>
              <div className="flex-1 overflow-x-auto px-4 sm:px-6">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
                      <th className="pb-3 text-sm font-medium text-neutral-500">Name</th>
                      <th className="pb-3 text-sm font-medium text-neutral-500">Email</th>
                      <th className="pb-3 text-sm font-medium text-neutral-500">Registered</th>
                      <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((user) => {
                      const active = user.accountStatusCode !== "suspended" && user.accountStatusCode !== "inactive";
                      return (
                        <tr key={user.id} style={{ borderBottom: "1px solid #F8F8F8" }} className="hover:bg-neutral-50">
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
                                {user.name.trim()[0]?.toUpperCase() ?? "?"}
                              </div>
                              <span className="text-sm text-neutral-900">{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-sm text-neutral-700">{user.email}</td>
                          <td className="py-3.5 text-sm text-neutral-700">{portalDate(user.createdAt)}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-green-50 text-green-600" : "bg-neutral-100 text-neutral-500"}`}>
                              {user.accountStatusName}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              disabled={busyId === user.id}
                              onClick={() => void setStatus(user, active ? "suspended" : "active")}
                              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
                              style={{ border: "1px solid #E0E0E0" }}
                            >
                              {busyId === user.id ? "Saving…" : active ? "Suspend" : "Reactivate"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="py-10 text-center text-sm text-neutral-500">No users match your search.</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6" style={{ borderTop: "1px solid #F0F0F0" }}>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Previous page" onClick={() => setCurrentPage(Math.max(1, page - 1))} className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4" /></button>
                  <span className="px-2 text-sm text-neutral-600">Page {page} of {totalPages}</span>
                  <button type="button" aria-label="Next page" onClick={() => setCurrentPage(Math.min(totalPages, page + 1))} className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4" /></button>
                </div>
                <span className="text-sm text-neutral-500">{filtered.length} users</span>
              </div>
            </>
          );
        }}
      </DataBoundary>
    </div>
  );
}
