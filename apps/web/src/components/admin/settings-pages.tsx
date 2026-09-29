"use client";

import { fetchLookups } from "@/lib/listings-api";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

/**
 * Admin settings limited to what the platform actually applies. Policy editors
 * whose values nothing enforces are kept out of the product (see
 * components/deferred/settings-policy-preview.tsx).
 */

function PolicyNotConfigurable({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="max-w-[800px] px-4 py-5 sm:px-6">
        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{title}</h1>
        <div className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-700" style={{ border: "1px solid #F0F0F0" }}>
          <p className="font-semibold text-neutral-900">Not configurable in this release</p>
          <p className="mt-1">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const lookups = useBackendData(fetchLookups, [], "Material categories could not be loaded.");

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-4 py-5 sm:px-6">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Product Categories</h1>
        </div>
        <p className="mb-6 text-sm text-neutral-500">
          Material categories sellers can choose when listing. They are maintained in the EcoGlobe
          catalog; editing categories from this screen is not available yet.
        </p>
        <DataBoundary
          state={lookups}
          loadingLabel="Loading categories…"
          isEmpty={(data) => (data.MaterialTypes ?? []).length === 0}
          empty={{ title: "No material categories are configured." }}
        >
          {(data) => (
            <div className="flex flex-col">
              {(data.MaterialTypes ?? []).map((cat) => (
                <div key={cat.id} className="mb-3 rounded-xl px-5 py-4" style={{ border: "1px solid #F0F0F0" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{cat.name}</span>
                    <span className="font-mono text-xs text-neutral-400">{cat.code}</span>
                  </div>
                  {cat.description && <p className="mt-1 text-xs text-neutral-500">{cat.description}</p>}
                </div>
              ))}
            </div>
          )}
        </DataBoundary>
      </div>
    </div>
  );
}

export function SellerSettingsPage() {
  return (
    <PolicyNotConfigurable
      title="Seller Settings"
      detail="Seller rules are fixed by the platform. Listings are published through listing moderation and companies are verified through KYC review."
    />
  );
}

export function BuyerSettingsPage() {
  return (
    <PolicyNotConfigurable
      title="Buyer Settings"
      detail="Buyer rules are fixed by the platform. Buyer companies are verified through KYC review."
    />
  );
}

export function EscrowSettingsPage() {
  return (
    <PolicyNotConfigurable
      title="Escrow Settings"
      detail="Escrow funding is confirmed only by the payment provider, and releases are handled by EcoGlobe staff on each escrow record. Automatic release rules and fees are not configurable here."
    />
  );
}

export function PaymentSettingsPage() {
  return (
    <PolicyNotConfigurable
      title="Payment Settings"
      detail="Online payments use Stripe Checkout when the provider is configured for this environment. Payment methods, taxes and payout schedules are not configurable here."
    />
  );
}

export function TransactionRulesPage() {
  return (
    <PolicyNotConfigurable
      title="Transaction Rules"
      detail="Custom transaction rules are not supported yet. Order, checkout and approval checks are applied by the backend and cannot be edited from this screen."
    />
  );
}
