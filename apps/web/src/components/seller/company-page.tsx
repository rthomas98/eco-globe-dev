"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@eco-globe/ui";
import { useDemoUser } from "@/lib/demo-user";
import { fetchCompany, fetchCompanyMembers, portalDate } from "@/lib/api-portal";
import { createCompanyLocation, fetchCompanyLocations } from "@/lib/listings-api";
import { describeBackendError } from "@/lib/backend-client";
import { formatCompanyLocation } from "@/lib/use-company-locations";
import { validateFacilityDraft } from "@/lib/location-format";
import { DataBoundary, LoadingState, useBackendData } from "@/components/shared/data-state";
import { SellerLayout } from "./seller-layout";

/** The active seller company as recorded by the backend. */
export function SellerCompanyPage() {
  const user = useDemoUser();
  const companyId = user?.activeCompanyId;
  return (
    <SellerLayout title="Company">
      {companyId ? (
        <CompanyDetails companyId={companyId} portal="seller" />
      ) : user ? (
        <p className="px-6 py-12 text-center text-sm text-neutral-500">Select a company to see its details.</p>
      ) : (
        <LoadingState />
      )}
    </SellerLayout>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CompanyDetails({ companyId, portal }: { companyId: number; portal: "buyer" | "seller" }) {
  const company = useBackendData(() => fetchCompany(companyId), [companyId], "Company details could not be loaded.");
  const locations = useBackendData(() => fetchCompanyLocations(companyId), [companyId], "Locations could not be loaded.");
  const members = useBackendData(() => fetchCompanyMembers(companyId), [companyId], "Team members could not be loaded.");
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <h1 className="px-1 text-2xl font-bold text-neutral-900">Company</h1>

      <Section title="Company record">
        <DataBoundary state={company} empty={{ title: "" }}>
          {(c) => (
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-neutral-500">Legal name</dt>
                <dd className="mt-1 font-semibold text-neutral-900">{c.legalName}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Company type</dt>
                <dd className="mt-1 font-semibold capitalize text-neutral-900">{c.companyTypeCode}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Verification</dt>
                <dd className="mt-1 font-semibold text-neutral-900">
                  {c.verificationStatusCode.replace(/_/g, " ")}{" "}
                  <Link href={`/${portal}/verification`} className="ml-1 text-xs font-medium underline">
                    Manage
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Registered</dt>
                <dd className="mt-1 text-neutral-900">{portalDate(c.createdAt)}</dd>
              </div>
            </dl>
          )}
        </DataBoundary>
      </Section>

      <Section
        title="Facilities and locations"
        action={
          !adding && (
            <Button variant="secondary" size="md" onClick={() => setAdding(true)}>
              Add location
            </Button>
          )
        }
      >
        {adding && (
          <AddLocationForm
            companyId={companyId}
            locationTypeCode={portal === "seller" ? "pickup" : "delivery"}
            onDone={(saved) => {
              setAdding(false);
              if (saved) locations.reload();
            }}
          />
        )}
        <DataBoundary
          state={locations}
          loadingLabel="Loading locations…"
          isEmpty={(rows) => rows.length === 0}
          empty={{ title: "No locations recorded", description: portal === "seller" ? "Add the facilities buyers pick up from." : "Add the sites you receive deliveries at." }}
        >
          {(rows) => (
            <ul className="flex flex-col gap-2">
              {rows.map((l) => (
                <li key={l.id} className="rounded-lg bg-neutral-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-neutral-900">
                    {l.name}
                    {l.isDefault && <span className="ml-2 text-xs font-normal text-neutral-500">Default</span>}
                  </p>
                  <p className="text-neutral-600">{formatCompanyLocation(l)}</p>
                </li>
              ))}
            </ul>
          )}
        </DataBoundary>
      </Section>

      <Section
        title="Team"
        action={
          <Link href={`/${portal}/account`} className="text-sm font-semibold text-neutral-900 underline">
            Manage team
          </Link>
        }
      >
        <DataBoundary
          state={members}
          loadingLabel="Loading team…"
          isEmpty={(rows) => rows.length === 0}
          empty={{ title: "No team members recorded" }}
        >
          {(rows) => (
            <ul className="flex flex-col gap-2">
              {rows.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold text-neutral-900">{m.userName}</span>{" "}
                    <span className="text-neutral-500">{m.userEmail}</span>
                  </span>
                  <span className="text-xs capitalize text-neutral-600">
                    {m.memberRoleCode.replace(/_/g, " ")} · {m.memberStatusCode}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DataBoundary>
      </Section>

      <Section title="Documents">
        <p className="text-sm text-neutral-600">
          Certificates and compliance files are kept in{" "}
          <Link href={`/${portal}/documents`} className="font-semibold underline">
            Documents
          </Link>{" "}
          and{" "}
          <Link href={`/${portal}/verification`} className="font-semibold underline">
            Verification
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}

function AddLocationForm({
  companyId,
  locationTypeCode,
  onDone,
}: {
  companyId: number;
  locationTypeCode: "pickup" | "delivery";
  onDone: (saved: boolean) => void;
}) {
  const [form, setForm] = useState({ name: "", addressLine1: "", city: "", stateProvince: "", postalCode: "", countryCode: "US" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const checked = validateFacilityDraft({ ...form, latitude: "", longitude: "" });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createCompanyLocation(companyId, { ...checked.value, locationTypeCode });
      onDone(true);
    } catch (err) {
      setError(describeBackendError(err, "The location was not saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-2">
      <Input label="Facility name" id="loc-name" value={form.name} onChange={(e) => update("name", e.target.value)} />
      <Input label="Street address" id="loc-line1" value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} />
      <Input label="City" id="loc-city" value={form.city} onChange={(e) => update("city", e.target.value)} />
      <Input label="State / province" id="loc-state" value={form.stateProvince} onChange={(e) => update("stateProvince", e.target.value)} />
      <Input label="Postal / ZIP code" id="loc-zip" value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
      <Input label="Country (2-letter code, e.g. US)" id="loc-country" value={form.countryCode} maxLength={2} onChange={(e) => update("countryCode", e.target.value.toUpperCase())} />
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button variant="secondary" size="md" onClick={() => onDone(false)}>
          Cancel
        </Button>
        <Button variant="primary" size="md" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save location"}
        </Button>
      </div>
    </div>
  );
}
