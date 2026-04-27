"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, MoreHorizontal, X } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";

type PaymentMethod = {
  id: string;
  type: "bank" | "card";
  brand: "us-bank" | "mastercard" | "visa";
  label: string;
  last4: string;
  expires: string;
  isDefault?: boolean;
};

const initialMethods: PaymentMethod[] = [
  {
    id: "pm_1",
    type: "bank",
    brand: "us-bank",
    label: "US Bank Account",
    last4: "1234",
    expires: "10/28",
    isDefault: true,
  },
  {
    id: "pm_2",
    type: "bank",
    brand: "us-bank",
    label: "US Bank Account",
    last4: "4567",
    expires: "10/26",
  },
  {
    id: "pm_3",
    type: "card",
    brand: "mastercard",
    label: "Credit Card",
    last4: "9876",
    expires: "10/26",
  },
];

function MethodIcon({ method }: { method: PaymentMethod }) {
  if (method.type === "bank") {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
        <Building2 className="size-6 text-neutral-600" />
      </div>
    );
  }
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
      <div className="relative h-6 w-9">
        <span className="absolute left-0 top-0 size-6 rounded-full bg-red-500" />
        <span className="absolute right-0 top-0 size-6 rounded-full bg-amber-500 mix-blend-multiply" />
      </div>
    </div>
  );
}

function ActionMenu({
  onMakeDefault,
  onEdit,
  onDelete,
  onClose,
  showMakeDefault,
}: {
  onMakeDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  showMakeDefault: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl bg-white py-1 shadow-lg"
      style={{ border: "1px solid #E0E0E0" }}
    >
      {showMakeDefault && (
        <button
          type="button"
          onClick={onMakeDefault}
          className="block w-full px-4 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
        >
          Make as Default
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="block w-full px-4 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="block w-full px-4 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
      >
        Delete
      </button>
    </div>
  );
}

function MethodRow({
  method,
  onMakeDefault,
  onDelete,
}: {
  method: PaymentMethod;
  onMakeDefault: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white px-5 py-4">
      <MethodIcon method={method} />
      <p className="flex-1 text-base font-semibold text-neutral-900">
        {method.label} ****{method.last4}
      </p>
      <p className="hidden text-sm text-neutral-700 sm:block">
        Expires {method.expires}
      </p>
      <div className="flex w-[120px] items-center justify-end gap-3">
        {method.isDefault && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Default
          </span>
        )}
        <div className="relative">
          <button
            type="button"
            aria-label="Actions"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <MoreHorizontal className="size-5" />
          </button>
          {menuOpen && (
            <ActionMenu
              showMakeDefault={!method.isDefault}
              onMakeDefault={() => {
                onMakeDefault(method.id);
                setMenuOpen(false);
              }}
              onEdit={() => setMenuOpen(false)}
              onDelete={() => {
                onDelete(method.id);
                setMenuOpen(false);
              }}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const ownershipTypes = [
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
  { value: "joint", label: "Joint" },
];

const states = [
  { value: "LA", label: "Louisiana" },
  { value: "TX", label: "Texas" },
  { value: "CA", label: "California" },
  { value: "NY", label: "New York" },
  { value: "FL", label: "Florida" },
];

function AddPaymentModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (m: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<"bank" | "card">("bank");
  const [billing, setBilling] = useState<"same" | "different">("same");

  const handleAdd = () => {
    const id = `pm_${Date.now()}`;
    onAdd(
      method === "bank"
        ? {
            id,
            type: "bank",
            brand: "us-bank",
            label: "US Bank Account",
            last4: "0000",
            expires: "12/30",
          }
        : {
            id,
            type: "card",
            brand: "mastercard",
            label: "Credit Card",
            last4: "0000",
            expires: "12/30",
          },
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6">
          <h2 className="text-2xl font-bold text-neutral-900">
            Add payment method
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 pb-6">
          {/* Method radio */}
          <div className="flex flex-col gap-4 pb-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <RadioRow
              label="Bank Account"
              checked={method === "bank"}
              onChange={() => setMethod("bank")}
            />
            <RadioRow
              label="Credit Card"
              checked={method === "card"}
              onChange={() => setMethod("card")}
            />
          </div>

          {method === "bank" ? (
            <BankFields
              billing={billing}
              onBillingChange={setBilling}
            />
          ) : (
            <CardFields />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-5" style={{ borderTop: "1px solid #F0F0F0" }}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleAdd}>
            Add Payment
          </Button>
        </div>
      </div>
    </div>
  );
}

function RadioRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-3 text-left"
    >
      <span
        className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors ${
          checked ? "border-neutral-900" : "border-neutral-300"
        }`}
      >
        {checked && <span className="size-2.5 rounded-full bg-neutral-900" />}
      </span>
      <span className="text-base font-medium text-neutral-900">{label}</span>
    </button>
  );
}

function BankFields({
  billing,
  onBillingChange,
}: {
  billing: "same" | "different";
  onBillingChange: (b: "same" | "different") => void;
}) {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h3 className="mb-4 text-lg font-bold text-neutral-900">
          Account holder
        </h3>
        <div className="flex flex-col gap-5">
          <Select
            label="Account ownership type"
            id="ownership"
            options={ownershipTypes}
          />
          <div>
            <Input label="Account holder name" id="holder" />
            <p className="mt-1.5 text-xs text-neutral-500">
              Name as it appears on your bank account.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-6">
        <h3 className="mb-4 text-lg font-bold text-neutral-900">Bank Details</h3>
        <div className="flex flex-col gap-5">
          <Input label="Bank name" id="bank-name" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Input
                label="Routing number (ABA)"
                id="routing"
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                9-digit routing number for US banks.
              </p>
            </div>
            <div>
              <Input
                label="Account number"
                id="account"
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                We&apos;ll never share your account number.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-6">
        <h3 className="mb-4 text-lg font-bold text-neutral-900">
          Billing Address
        </h3>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => onBillingChange("same")}
            className="flex items-start gap-3 text-left"
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                billing === "same" ? "border-neutral-900" : "border-neutral-300"
              }`}
            >
              {billing === "same" && (
                <span className="size-2.5 rounded-full bg-neutral-900" />
              )}
            </span>
            <span>
              <span className="block text-base font-medium text-neutral-900">
                Same as my address in this account
              </span>
              <span className="block text-sm text-neutral-500">
                1165 Bayou Paul Ln, St Gabriel, Baton rouge, 93264 LA
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onBillingChange("different")}
            className="flex items-center gap-3 text-left"
          >
            <span
              className={`flex size-5 items-center justify-center rounded-full border-2 ${
                billing === "different"
                  ? "border-neutral-900"
                  : "border-neutral-300"
              }`}
            >
              {billing === "different" && (
                <span className="size-2.5 rounded-full bg-neutral-900" />
              )}
            </span>
            <span className="text-base font-medium text-neutral-900">
              Different billing address
            </span>
          </button>

          {billing === "different" && (
            <div className="mt-2 flex flex-col gap-5">
              <Input label="Street address" id="street" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="City" id="city" />
                <Select label="State" id="state" options={states} />
              </div>
              <Input label="Zip Code" id="zip" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardFields() {
  return (
    <div className="flex flex-col gap-5 pt-6">
      <Input label="Card number" id="card-number" />
      <Input label="Name on card" id="card-name" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input label="Expiry date" id="card-expiry" placeholder="MM/YY" />
        <Input label="CVV" id="card-cvv" placeholder="CVV" />
      </div>
    </div>
  );
}

export function BankAccountPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods);
  const [showAdd, setShowAdd] = useState(false);

  const handleMakeDefault = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({ ...m, isDefault: m.id === id })),
    );
  };

  const handleDelete = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAdd = (m: PaymentMethod) => {
    setMethods((prev) => [...prev, m]);
  };

  return (
    <SellerLayout title="Bank Account">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900">Bank Account</h1>
        <Button variant="primary" size="md" onClick={() => setShowAdd(true)}>
          Add Bank Account
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {methods.map((m) => (
          <MethodRow
            key={m.id}
            method={m}
            onMakeDefault={handleMakeDefault}
            onDelete={handleDelete}
          />
        ))}
        {methods.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center text-neutral-500">
            No payment methods yet.
          </div>
        )}
      </div>

      {showAdd && (
        <AddPaymentModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />
      )}
    </SellerLayout>
  );
}
