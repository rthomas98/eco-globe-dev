"use client";

import { useId, useRef, useState } from "react";
import { Button, Input, Select } from "@eco-globe/ui";
import {
  newIdempotencyKey,
  requestFedexQuote,
  type FedexAddress,
  type FedexServiceOption,
  type FedexShipment,
} from "@/lib/api-fedex-sandbox";
import { describeBackendError } from "@/lib/backend-client";

type AddressDraft = Record<
  | "name"
  | "company"
  | "phone"
  | "street1"
  | "street2"
  | "city"
  | "stateOrProvince"
  | "postalCode"
  | "countryCode",
  string
> & { residential: boolean };

const emptyAddress = (): AddressDraft => ({
  name: "",
  company: "",
  phone: "",
  street1: "",
  street2: "",
  city: "",
  stateOrProvince: "",
  postalCode: "",
  countryCode: "US",
  residential: false,
});

function toAddress(draft: AddressDraft): FedexAddress {
  const trim = (value: string) => value.trim();
  // Optional fields are omitted when blank rather than sent as null.
  return {
    name: trim(draft.name),
    ...(trim(draft.company) ? { company: trim(draft.company) } : {}),
    phone: trim(draft.phone),
    street1: trim(draft.street1),
    ...(trim(draft.street2) ? { street2: trim(draft.street2) } : {}),
    city: trim(draft.city),
    stateOrProvince: trim(draft.stateOrProvince).toUpperCase(),
    postalCode: trim(draft.postalCode),
    countryCode: trim(draft.countryCode).toUpperCase(),
    residential: draft.residential,
  };
}

function addressError(label: string, address: FedexAddress) {
  if (!address.name) return `${label}: enter a contact name.`;
  if (!address.phone || address.phone.replace(/\D/g, "").length < 10)
    return `${label}: enter a phone number with at least 10 digits.`;
  if (!address.street1) return `${label}: enter a street address.`;
  if (!address.city) return `${label}: enter a city.`;
  // The sandbox integration accepts US domestic parcels only; the backend enforces this too.
  if (address.countryCode !== "US")
    return `${label}: only US addresses are supported in this sandbox.`;
  if (!/^[A-Z]{2}$/.test(address.stateOrProvince))
    return `${label}: enter a two-letter state code, such as TX.`;
  if (!/^\d{5}(-\d{4})?$/.test(address.postalCode))
    return `${label}: enter a US ZIP code.`;
  return null;
}

function AddressFieldset({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: AddressDraft;
  onChange: (next: AddressDraft) => void;
}) {
  const baseId = useId();
  const field = (
    key: Exclude<keyof AddressDraft, "residential">,
    label: string,
    extra: Partial<React.ComponentProps<typeof Input>> = {},
  ) => (
    <Input
      id={`${baseId}-${key}`}
      label={label}
      value={value[key]}
      onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      {...extra}
    />
  );
  return (
    <fieldset
      className="grid gap-3 rounded-xl p-4 sm:grid-cols-2"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <legend className="px-1 text-sm font-semibold text-neutral-900">
        {legend}
      </legend>
      {field("name", "Contact name", { required: true, autoComplete: "off" })}
      {field("company", "Company (optional)", { autoComplete: "off" })}
      {field("phone", "Phone", {
        required: true,
        type: "tel",
        autoComplete: "off",
      })}
      {field("street1", "Street address", {
        required: true,
        autoComplete: "off",
      })}
      {field("street2", "Address line 2 (optional)", { autoComplete: "off" })}
      {field("city", "City", { required: true, autoComplete: "off" })}
      {field("stateOrProvince", "State code", {
        required: true,
        maxLength: 2,
        autoComplete: "off",
      })}
      {field("postalCode", "ZIP code", {
        required: true,
        maxLength: 10,
        autoComplete: "off",
      })}
      {field("countryCode", "Country code", {
        required: true,
        maxLength: 2,
        autoComplete: "off",
      })}
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={value.residential}
          onChange={(event) =>
            onChange({ ...value, residential: event.target.checked })
          }
        />
        Residential address
      </label>
    </fieldset>
  );
}

/**
 * Requests a FedEx sandbox rate quote. The backend persists the quote; nothing
 * is booked here. Booking is a separate, explicit admin action on the quote.
 */
export function FedexSandboxQuoteForm({
  services,
  onQuoted,
}: {
  services: FedexServiceOption[];
  onQuoted: (shipment: FedexShipment) => void;
}) {
  const baseId = useId();
  const available = services.filter((service) => service.available);
  const [shipper, setShipper] = useState(emptyAddress);
  const [recipient, setRecipient] = useState(emptyAddress);
  const [service, setService] = useState(available[0]?.code ?? "");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // One key per distinct request body, so a retry after a timeout cannot
  // create a second quote for the same submission.
  const pending = useRef<{ body: string; key: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const shipperAddress = toAddress(shipper);
    const recipientAddress = toAddress(recipient);
    const pkg = {
      weightLb: Number(weight),
      lengthIn: Number(length),
      widthIn: Number(width),
      heightIn: Number(height),
    };
    const problem =
      addressError("Sender", shipperAddress) ??
      addressError("Recipient", recipientAddress) ??
      (!service
        ? "Choose a FedEx sandbox service that is currently available."
        : null) ??
      (!(pkg.weightLb > 0 && pkg.weightLb <= 150)
        ? "Enter a package weight between 0.1 and 150 lb."
        : null) ??
      ([pkg.lengthIn, pkg.widthIn, pkg.heightIn].some(
        (d) => !(d > 0 && d <= 108),
      )
        ? "Enter package length, width and height between 1 and 108 in."
        : null) ??
      (pkg.lengthIn + 2 * (pkg.widthIn + pkg.heightIn) > 165
        ? "Length plus girth exceeds 165 in. Larger freight stays with the manual logistics workflow."
        : null);
    if (problem) {
      setError(problem);
      return;
    }
    const body = JSON.stringify({
      service,
      shipperAddress,
      recipientAddress,
      pkg,
    });
    if (pending.current?.body !== body)
      pending.current = { body, key: newIdempotencyKey() };
    setBusy(true);
    setError("");
    try {
      const shipment = await requestFedexQuote({
        idempotencyKey: pending.current.key,
        service,
        shipper: shipperAddress,
        recipient: recipientAddress,
        package: pkg,
      });
      pending.current = null;
      onQuoted(shipment);
    } catch (err) {
      setError(
        describeBackendError(
          err,
          "The FedEx sandbox quote could not be requested.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-xs text-neutral-500">
        US domestic addresses only. Enter test data; do not use real customer
        details.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <AddressFieldset
          legend="Sender"
          value={shipper}
          onChange={setShipper}
        />
        <AddressFieldset
          legend="Recipient"
          value={recipient}
          onChange={setRecipient}
        />
      </div>
      <fieldset
        className="grid gap-3 rounded-xl p-4 sm:grid-cols-5"
        style={{ border: "1px solid #F0F0F0" }}
      >
        <legend className="px-1 text-sm font-semibold text-neutral-900">
          Package and service
        </legend>
        <div className="sm:col-span-5">
          <Select
            id={`${baseId}-service`}
            label="FedEx sandbox service"
            value={service}
            onChange={(event) => setService(event.target.value)}
            options={[
              {
                value: "",
                label: available.length
                  ? "Choose a service"
                  : "No service available",
              },
              ...available.map((option) => ({
                value: option.code,
                label: option.label,
              })),
            ]}
          />
          {services.some((option) => !option.available) && (
            <ul className="mt-2 space-y-1 text-xs text-neutral-500">
              {services
                .filter((option) => !option.available)
                .map((option) => (
                  <li key={option.code}>
                    {option.label} is unavailable in this sandbox
                    {option.reason ? `: ${option.reason}` : "."}
                  </li>
                ))}
            </ul>
          )}
        </div>
        <Input
          id={`${baseId}-weight`}
          label="Weight (lb)"
          type="number"
          inputMode="decimal"
          min="0.1"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <Input
          id={`${baseId}-length`}
          label="Length (in)"
          type="number"
          inputMode="decimal"
          min="1"
          step="0.1"
          value={length}
          onChange={(e) => setLength(e.target.value)}
        />
        <Input
          id={`${baseId}-width`}
          label="Width (in)"
          type="number"
          inputMode="decimal"
          min="1"
          step="0.1"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
        <Input
          id={`${baseId}-height`}
          label="Height (in)"
          type="number"
          inputMode="decimal"
          min="1"
          step="0.1"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !available.length}>
          {busy ? "Requesting sandbox quote…" : "Request sandbox quote"}
        </Button>
        <p className="text-xs text-neutral-500">
          Requesting a quote does not book a shipment or create a label.
        </p>
      </div>
    </form>
  );
}
