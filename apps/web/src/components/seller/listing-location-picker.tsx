"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import { createCompanyLocation } from "@/lib/listings-api";
import { formatCompanyLocation, useCompanyLocations } from "@/lib/use-company-locations";

export { formatCompanyLocation, useCompanyLocations } from "@/lib/use-company-locations";

/**
 * Choose the persisted company facility a listing ships from, or add one.
 * Facilities come from the backend, never from browser-only profile data.
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    addressLine1: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    countryCode: "US",
    latitude: "",
    longitude: "",
  });

  const handleAdd = async () => {
    if (!companyId) return;
    if (!draft.name.trim() || !draft.addressLine1.trim() || !draft.city.trim() || !draft.countryCode.trim()) {
      setError("Name, address, city and country are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const latitude = draft.latitude.trim() ? Number(draft.latitude) : undefined;
      const longitude = draft.longitude.trim() ? Number(draft.longitude) : undefined;
      const created = await createCompanyLocation(companyId, {
        name: draft.name.trim(),
        addressLine1: draft.addressLine1.trim(),
        city: draft.city.trim(),
        stateProvince: draft.stateProvince.trim() || undefined,
        postalCode: draft.postalCode.trim() || undefined,
        countryCode: draft.countryCode.trim().toUpperCase().slice(0, 2),
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
        locationTypeCode: "pickup",
      });
      locations.add(created);
      onChange(String(created.id));
      setAdding(false);
      setDraft({ name: "", addressLine1: "", city: "", stateProvince: "", postalCode: "", countryCode: "US", latitude: "", longitude: "" });
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
        return (
          <label
            key={location.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl p-4"
            style={{ border: selected ? "2px solid #090909" : "1px solid #E0E0E0" }}
          >
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
        );
      })}
      {adding ? (
        <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-4" style={{ border: "1px solid #E0E0E0" }}>
          <p className="text-sm font-semibold text-neutral-900">New facility</p>
          <Input label="Facility name" id="loc-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input label="Address" id="loc-address" value={draft.addressLine1} onChange={(e) => setDraft({ ...draft, addressLine1: e.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="City" id="loc-city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            <Input label="State / province" id="loc-state" value={draft.stateProvince} onChange={(e) => setDraft({ ...draft, stateProvince: e.target.value })} />
            <Input label="Postal code" id="loc-postal" value={draft.postalCode} onChange={(e) => setDraft({ ...draft, postalCode: e.target.value })} />
            <Input label="Country code (2 letters)" id="loc-country" value={draft.countryCode} maxLength={2} onChange={(e) => setDraft({ ...draft, countryCode: e.target.value })} />
            <Input label="Latitude (optional)" id="loc-lat" value={draft.latitude} onChange={(e) => setDraft({ ...draft, latitude: e.target.value })} />
            <Input label="Longitude (optional)" id="loc-lng" value={draft.longitude} onChange={(e) => setDraft({ ...draft, longitude: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <Button variant="primary" size="md" onClick={() => void handleAdd()} disabled={saving}>
              {saving ? "Saving…" : "Save facility"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setAdding(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 self-start text-sm font-semibold text-neutral-900 hover:underline"
        >
          <Plus className="size-4" />
          Add a facility
        </button>
      )}
    </div>
  );
}
