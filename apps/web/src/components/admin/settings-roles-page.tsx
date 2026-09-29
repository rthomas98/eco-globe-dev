"use client";

import { fetchLookups, type LookupOption } from "@/lib/listings-api";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

function LookupTable({ title, description, rows }: { title: string; description: string; rows: LookupOption[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      <p className="mb-3 mt-1 text-sm text-neutral-500">{description}</p>
      {rows.length === 0 ? (
        <p className="rounded-xl px-5 py-6 text-sm text-neutral-500" style={{ border: "1px solid #F0F0F0" }}>
          None configured.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #F0F0F0" }}>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
                <th className="px-5 py-3 text-sm font-medium text-neutral-500">Name</th>
                <th className="px-5 py-3 text-sm font-medium text-neutral-500">Code</th>
                <th className="px-5 py-3 text-sm font-medium text-neutral-500">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #F8F8F8" }}>
                  <td className="px-5 py-3.5 text-sm font-medium text-neutral-900">{row.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-neutral-500">{row.code}</td>
                  <td className="px-5 py-3.5 text-sm text-neutral-700">{row.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Read-only view of the access model the backend enforces: company member
 * roles and permission tiers. Editing permissions here is not supported.
 */
export function SettingsRolesPage() {
  const lookups = useBackendData(fetchLookups, [], "Roles could not be loaded.");

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900">Roles &amp; Permissions</h1>
        <p className="mb-6 mt-1 max-w-3xl text-sm text-neutral-500">
          Access is granted by a person&apos;s role and permission tier within their company, and
          platform staff sign in with the admin role. This screen shows the roles EcoGlobe enforces;
          custom roles and permission editing are not available yet.
        </p>
        <DataBoundary state={lookups} loadingLabel="Loading roles…" empty={{ title: "No roles configured" }}>
          {(data) => (
            <>
              <LookupTable
                title="Company member roles"
                description="The role a person holds within a buyer or seller company."
                rows={data.MemberRoles ?? []}
              />
              <LookupTable
                title="Permission tiers"
                description="What a company member may do on behalf of their company."
                rows={data.PermissionTiers ?? []}
              />
            </>
          )}
        </DataBoundary>
      </div>
    </div>
  );
}
