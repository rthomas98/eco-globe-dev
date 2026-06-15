"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  FileText,
  MapPin,
  MoreHorizontal,
  X,
} from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import {
  buildDemoUser,
  type Facility,
  useDemoUser,
  writeDemoUser,
} from "@/lib/demo-user";
import { BuyerLayout } from "./buyer-layout";

type Row = {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
};

function EditLink() {
  return (
    <button
      type="button"
      className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
    >
      Edit
    </button>
  );
}

function InfoRow({ label, value, action }: Row) {
  return (
    <div
      className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      style={{ borderBottom: "1px solid #F0F0F0" }}
    >
      <span className="w-[240px] shrink-0 text-sm text-neutral-700">{label}</span>
      <div className="flex-1 text-sm text-neutral-900">{value}</div>
      {action}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      <div className="flex items-center gap-2 px-6 pb-2 pt-6">
        <Icon className="size-5 text-neutral-700" />
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

type LocationForm = {
  label: string;
  address: string;
};

const emptyLocationForm: LocationForm = {
  label: "",
  address: "",
};

function LocationModal({
  form,
  mode,
  error,
  onChange,
  onClose,
  onDelete,
  onSave,
}: {
  form: LocationForm;
  mode: "add" | "edit";
  error: string | null;
  onChange: (next: LocationForm) => void;
  onClose: () => void;
  onDelete?: () => void;
  onSave: () => void;
}) {
  const update = (key: keyof LocationForm, value: string) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close add location form"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <section
        className="relative z-10 w-full max-w-[560px] rounded-3xl bg-white p-6 shadow-2xl"
        aria-label={mode === "add" ? "Add location form" : "Edit location form"}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
              Saved location
            </p>
            <h2 className="mt-1 text-2xl font-bold text-neutral-900">
              {mode === "add" ? "Add Location" : "Edit Location"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Saved destination facilities are available during checkout and in
              the Carbon Calculator.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close form"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4">
          <Input
            id="buyer-location-label"
            label="Location name"
            placeholder="Example: Baton Rouge Terminal"
            value={form.label}
            onChange={(event) => update("label", event.target.value)}
          />
          <Input
            id="buyer-location-address"
            label="Street address"
            placeholder="Example: 1200 River Rd, Baton Rouge, LA 70802"
            value={form.address}
            onChange={(event) => update("address", event.target.value)}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-sm font-semibold text-red-700 underline underline-offset-2 hover:text-red-800"
              >
                Delete location
              </button>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="md" onClick={onSave}>
              {mode === "add" ? "Save Location" : "Save Changes"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function BuyerCompanyPage() {
  const demoUser = useDemoUser();
  const user = demoUser ?? buildDemoUser("buyer");
  const [locations, setLocations] = useState<Facility[]>(user.facilities ?? []);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [locationForm, setLocationForm] =
    useState<LocationForm>(emptyLocationForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocations(user.facilities ?? []);
  }, [user.facilities]);

  const openAddLocation = () => {
    setModalMode("add");
    setEditingId(null);
    setLocationForm(emptyLocationForm);
    setFormError(null);
  };

  const openEditLocation = (facility: Facility) => {
    setModalMode("edit");
    setEditingId(facility.id);
    setLocationForm({
      label: facility.label,
      address: facility.address,
    });
    setFormError(null);
  };

  const closeLocationModal = () => {
    setModalMode(null);
    setEditingId(null);
    setLocationForm(emptyLocationForm);
    setFormError(null);
  };

  const persistLocations = (nextLocations: Facility[]) => {
    setLocations(nextLocations);
    writeDemoUser({
      ...user,
      facilities: nextLocations,
    });
  };

  const saveLocation = () => {
    const label = locationForm.label.trim();
    const address = locationForm.address.trim();

    if (!label || !address) {
      setFormError("Enter both a location name and street address.");
      return;
    }

    const nextLocation: Facility = {
      id: editingId ?? `buyer-location-${Date.now().toString(36)}`,
      label,
      address,
    };
    const nextLocations =
      modalMode === "edit" && editingId
        ? locations.map((facility) =>
            facility.id === editingId ? nextLocation : facility,
          )
        : [...locations, nextLocation];

    persistLocations(nextLocations);
    setNotice(`${label} saved.`);
    closeLocationModal();
  };

  const deleteLocation = () => {
    if (!editingId) return;
    const deleted = locations.find((facility) => facility.id === editingId);
    const nextLocations = locations.filter((facility) => facility.id !== editingId);
    persistLocations(nextLocations);
    setNotice(`${deleted?.label ?? "Location"} deleted.`);
    closeLocationModal();
  };

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col overflow-y-auto bg-neutral-50 px-8 py-6">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Company</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Manage buyer company details and saved destination facilities.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={openAddLocation}
            >
              Add Location
            </Button>
          </div>

          {notice && (
            <div
              className="flex items-center justify-between gap-4 rounded-2xl bg-green-50 px-5 py-4 text-sm font-semibold text-green-800"
              style={{ border: "1px solid #BBF7D0" }}
            >
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-green-900 underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <SectionCard title="Company Information" icon={Building2}>
            <div
              className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderBottom: "1px solid #F0F0F0" }}
            >
              <span className="w-[240px] shrink-0 text-sm text-neutral-700">Logo</span>
              <div className="flex-1">
                <div className="flex size-14 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white">
                  AG
                </div>
              </div>
              <div className="flex items-center gap-5">
                <button className="text-sm font-medium text-neutral-500 underline underline-offset-2 hover:text-neutral-700">
                  Delete
                </button>
                <button className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
                  Update
                </button>
              </div>
            </div>
            <InfoRow label="Company Name" value="AgriCorp Solutions" action={<EditLink />} />
            <InfoRow label="Company Registration Number" value="AG-20411" action={<EditLink />} />
            <InfoRow label="Industry Sector" value={user.industry ?? "Carbon Black"} action={<EditLink />} />
            <InfoRow label="Company Size" value={user.companySize ?? "Big"} action={<EditLink />} />
            <InfoRow label="Country" value="US" action={<EditLink />} />
            <InfoRow
              label="Business Address"
              value="400 Concourse Blvd NE, Atlanta, GA 30308, US"
              action={<EditLink />}
            />
            <InfoRow
              label="Verification Status"
              value={
                <span className="inline-flex items-center gap-2">
                  Verified buyer
                  <CheckCircle2 className="size-4 text-green-600" />
                </span>
              }
            />
          </SectionCard>

          <SectionCard title="Saved Locations" icon={MapPin}>
            {locations.map((facility) => (
              <InfoRow
                key={facility.id}
                label="Destination facility"
                value={
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{facility.label}</span>
                    <span className="text-neutral-500">{facility.address}</span>
                  </div>
                }
                action={
                  <button
                    type="button"
                    onClick={() => openEditLocation(facility)}
                    className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                  >
                    Edit
                  </button>
                }
              />
            ))}
            <div className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="w-[240px] shrink-0 text-sm text-neutral-700">Add location</span>
              <div className="flex-1 text-sm text-neutral-500">
                Saved locations are used by checkout delivery addresses and the Carbon Calculator.
              </div>
              <button
                type="button"
                onClick={openAddLocation}
                className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Add
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Authorized Representative" icon={FileText}>
            <InfoRow label="Full name" value={user.name} action={<EditLink />} />
            <InfoRow label="Role" value={user.userRole ?? "Sustainability Manager"} action={<EditLink />} />
            <InfoRow label="Work Email" value={user.email} action={<EditLink />} />
            <InfoRow label="Work Phone" value="225-555-0198" action={<EditLink />} />
          </SectionCard>

          <SectionCard title="Documents" icon={FileText}>
            <InfoRow
              label="Buyer Verification"
              value="Buyer_Verification_AG-20411.pdf"
              action={
                <div className="flex items-center gap-3">
                  <button className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
                    Update
                  </button>
                  <button className="flex size-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
              }
            />
            <div className="px-6 py-5 text-sm text-neutral-500">
              Keep company and compliance documents current so sellers can approve quotes faster.
            </div>
          </SectionCard>
        </div>
      </div>
      {modalMode && (
        <LocationModal
          form={locationForm}
          mode={modalMode}
          error={formError}
          onChange={setLocationForm}
          onClose={closeLocationModal}
          onDelete={modalMode === "edit" ? deleteLocation : undefined}
          onSave={saveLocation}
        />
      )}
    </BuyerLayout>
  );
}
