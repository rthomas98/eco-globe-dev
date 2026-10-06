"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import { createCompanyLocation, updateCompanyLocation, type CompanyLocation } from "@/lib/listings-api";
import { formatCompanyLocation, useCompanyLocations } from "@/lib/use-company-locations";
import { validateFacilityDraft, type FacilityDraft } from "@/lib/location-format";

export { formatCompanyLocation, useCompanyLocations } from "@/lib/use-company-locations";

const EMPTY_DRAFT: FacilityDraft = {
  name: "",
  addressLine1: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  countryCode: "US",
  latitude: "",
  longitude: "",
};

/** Prefill an edit form with exactly what is saved; nothing is corrected or guessed. */
function draftFromLocation(location: CompanyLocation): FacilityDraft {
  return {
    name: location.name ?? "",
    addressLine1: location.addressLine1 ?? "",
    city: location.city ?? "",
    stateProvince: location.stateProvince ?? "",
    postalCode: location.postalCode ?? "",
    countryCode: location.countryCode ?? "",
    latitude: location.latitude === null ? "" : String(location.latitude),
    longitude: location.longitude === null ? "" : String(location.longitude),
  };
}

function FacilityForm({
  title,
  draft,
  onDraft,
  error,
  saving,
  onSave,
  onCancel,
}: {
  title: string;
  draft: FacilityDraft;
  onDraft: (draft: FacilityDraft) => void;
  error: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-4" style={{ border: "1px solid #E0E0E0" }}>
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <Input label="Facility name" id="loc-name" value={draft.name} onChange={(e) => onDraft({ ...draft, name: e.target.value })} />
      <Input label="Address" id="loc-address" value={draft.addressLine1} onChange={(e) => onDraft({ ...draft, addressLine1: e.target.value })} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="City" id="loc-city" value={draft.city} onChange={(e) => onDraft({ ...draft, city: e.target.value })} />
        <Input label="State / province" id="loc-state" value={draft.stateProvince} onChange={(e) => onDraft({ ...draft, stateProvince: e.target.value })} />
        <Input label="Postal / ZIP code" id="loc-postal" value={draft.postalCode} autoComplete="postal-code" onChange={(e) => onDraft({ ...draft, postalCode: e.target.value })} />
        <Input label="Country (2-letter code, e.g. US)" id="loc-country" value={draft.countryCode} maxLength={2} autoComplete="country" onChange={(e) => onDraft({ ...draft, countryCode: e.target.value.toUpperCase() })} />
        <Input label="Latitude (optional)" id="loc-lat" value={draft.latitude} onChange={(e) => onDraft({ ...draft, latitude: e.target.value })} />
        <Input label="Longitude (optional)" id="loc-lng" value={draft.longitude} onChange={(e) => onDraft({ ...draft, longitude: e.target.value })} />
      </div>
      <p className="text-xs text-neutral-500">
        Coordinates place this site on buyer maps and distance filters. Copy them from your facility records or a map app; EcoGlobe does not guess them. Leave both blank to clear them.
      </p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="md" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save facility"}
        </Button>
        <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * Choose the persisted company facility a listing ships from, add one, or
 * correct a saved one. Facilities come from the backend, never from
 * browser-only profile data.
 */
export function ListingLocationPicker({
  companyId,
  value,
  onChange,
  locations,
}: {
  companyId: number | undefined;
  value: string;
  onChange: (locationId: string) => void;
  locations: ReturnType<typeof useCompanyLocations>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<FacilityDraft>(EMPTY_DRAFT);

  const closeForm = () => {
    setAdding(false);
    setEditingId(null);
    setError("");
    setDraft(EMPTY_DRAFT);
  };

  const startEdit = (location: CompanyLocation) => {
    setAdding(false);
    setError("");
    setEditingId(location.id);
    setDraft(draftFromLocation(location));
  };

  const handleSave = async () => {
    if (!companyId) return;
    const checked = validateFacilityDraft(draft);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId !== null) {
        const v = checked.value;
        await updateCompanyLocation(editingId, {
          name: v.name,
          addressLine1: v.addressLine1,
          city: v.city,
          stateProvince: v.stateProvince ?? null,
          postalCode: v.postalCode ?? null,
          countryCode: v.countryCode,
          latitude: v.latitude ?? null,
          longitude: v.longitude ?? null,
        });
        // Re-read the saved row so the list shows exactly what the backend stored.
        locations.reload();
      } else {
        const created = await createCompanyLocation(companyId, {
          ...checked.value,
          locationTypeCode: "pickup",
        });
        locations.add(created);
        onChange(String(created.id));
      }
      closeForm();
    } catch (err) {
      setError(describeBackendError(err, "The facility could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  if (locations.status === "no-company") {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Your account has no active seller company yet. Complete seller onboarding before adding a listing.
      </p>
    );
  }
  if (locations.status === "loading") {
    return <p className="text-sm text-neutral-500">Loading your facilities…</p>;
  }
  if (locations.status === "error") {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {locations.error}
        <button type="button" onClick={locations.reload} className="ml-2 font-semibold underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {locations.locations.length === 0 && !adding && (
        <p className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
          No facilities are saved for your company yet. Add the site this listing ships from.
        </p>
      )}
      {locations.locations.map((location) => {
        const selected = value === String(location.id);
        if (editingId === location.id) {
          return (
            <FacilityForm
              key={location.id}
              title={`Edit ${location.name}`}
              draft={draft}
              onDraft={setDraft}
              error={error}
              saving={saving}
              onSave={() => void handleSave()}
              onCancel={closeForm}
            />
          );
        }
        return (
          <div
            key={location.id}
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ border: selected ? "2px solid #090909" : "1px solid #E0E0E0" }}
          >
            <label className="flex flex-1 cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="listing-location"
                checked={selected}
                onChange={() => onChange(String(location.id))}
                className="mt-1 size-4 accent-neutral-900"
              />
              <div>
                <p className="text-sm font-bold text-neutral-900">{location.name}</p>
                <p className="text-xs text-neutral-500">{formatCompanyLocation(location)}</p>
                {(location.latitude === null || location.longitude === null) && (
                  <p className="mt-1 text-xs text-amber-700">
                    No coordinates saved: this site will not appear on maps or distance estimates.
                  </p>
                )}
              </div>
            </label>
            <button
              type="button"
              onClick={() => startEdit(location)}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline"
              aria-label={`Edit facility ${location.name}`}
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
          </div>
        );
      })}
      {adding ? (
        <FacilityForm
          title="New facility"
          draft={draft}
          onDraft={setDraft}
          error={error}
          saving={saving}
          onSave={() => void handleSave()}
          onCancel={closeForm}
        />
      ) : (
        editingId === null && (
          <button
            type="button"
            onClick={() => {
              closeForm();
              setAdding(true);
            }}
            className="flex items-center gap-2 self-start text-sm font-semibold text-neutral-900 hover:underline"
          >
            <Plus className="size-4" />
            Add a facility
          </button>
        )
      )}
    </div>
  );
}
