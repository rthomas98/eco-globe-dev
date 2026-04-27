"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Plus, MoreHorizontal, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";

interface BankAccount {
  id: string;
  name: string;
  expires: string;
  isDefault?: boolean;
}

const INITIAL_ACCOUNTS: BankAccount[] = [
  {
    id: "1",
    name: "US Bank Account ****1234",
    expires: "Expires 10/28",
    isDefault: true,
  },
  {
    id: "2",
    name: "US Bank Account ****4567",
    expires: "Expires 10/26",
  },
];

const ACCOUNT_OWNERSHIP = [
  { value: "", label: "-- Choose --" },
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
];

const US_STATES = [
  { value: "", label: "-- Choose --" },
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "CA", label: "California" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "LA", label: "Louisiana" },
  { value: "NY", label: "New York" },
  { value: "TX", label: "Texas" },
  { value: "WA", label: "Washington" },
];

const PROFILE_ADDRESS = "1165 Bayou Paul Ln, St Gabriel, Baton rouge, 93264 LA";

function AccountRow({
  account,
  onMakeDefault,
  onEdit,
  onDelete,
}: {
  account: BankAccount;
  onMakeDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="relative flex items-center gap-4 rounded-2xl bg-white px-6 py-4"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
        <Building2 className="size-5 text-neutral-700" />
      </div>
      <div className="flex-1">
        <p className="text-base font-bold text-neutral-900">{account.name}</p>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm text-neutral-700">{account.expires}</p>
        {account.isDefault && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Default
          </span>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More"
          className="flex size-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-2 top-14 z-50 w-[200px] rounded-xl bg-white py-2"
            style={{
              border: "1px solid #F0F0F0",
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            }}
          >
            {!account.isDefault && (
              <button
                type="button"
                onClick={() => {
                  onMakeDefault();
                  setMenuOpen(false);
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
              >
                Make as Default
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onEdit();
                setMenuOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete();
                setMenuOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface FormState {
  ownershipType: string;
  holderName: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  billingMode: "same" | "different";
  street: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY_FORM: FormState = {
  ownershipType: "",
  holderName: "",
  bankName: "",
  routingNumber: "",
  accountNumber: "",
  billingMode: "same",
  street: "",
  city: "",
  state: "",
  zip: "",
};

function AddPaymentMethodModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const differentFieldsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (form.billingMode === "different" && differentFieldsRef.current) {
      differentFieldsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [form.billingMode]);

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const isValid =
    form.ownershipType &&
    form.holderName.trim() &&
    form.bankName.trim() &&
    form.routingNumber.trim() &&
    form.accountNumber.trim() &&
    (form.billingMode === "same" ||
      (form.street.trim() && form.city.trim() && form.state && form.zip.trim()));

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(form);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[760px] flex-col rounded-2xl bg-white shadow-2xl">
        <header
          className="flex items-center justify-between px-8 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <h2 className="text-2xl font-bold text-neutral-900">
            Add payment method
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <h3 className="text-base font-bold text-neutral-900">
            Account holder
          </h3>
          <div className="mt-4 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="ownership"
                className="text-sm font-medium text-neutral-900"
              >
                Account ownership type
              </label>
              <select
                id="ownership"
                value={form.ownershipType}
                onChange={(e) => update("ownershipType", e.target.value)}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
                style={{ border: "1px solid #E0E0E0" }}
              >
                {ACCOUNT_OWNERSHIP.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="holder"
                className="text-sm font-medium text-neutral-900"
              >
                Account holder name
              </label>
              <input
                id="holder"
                type="text"
                value={form.holderName}
                onChange={(e) => update("holderName", e.target.value)}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                style={{ border: "1px solid #E0E0E0" }}
              />
              <p className="text-xs text-neutral-500">
                Name as it appears on your bank account.
              </p>
            </div>
          </div>

          <div
            className="my-6"
            style={{ borderTop: "1px solid #F0F0F0" }}
          />

          <h3 className="text-base font-bold text-neutral-900">Bank Details</h3>
          <div className="mt-4 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="bank"
                className="text-sm font-medium text-neutral-900"
              >
                Bank name
              </label>
              <input
                id="bank"
                type="text"
                value={form.bankName}
                onChange={(e) => update("bankName", e.target.value)}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                style={{ border: "1px solid #E0E0E0" }}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="routing"
                  className="text-sm font-medium text-neutral-900"
                >
                  Routing number (ABA)
                </label>
                <input
                  id="routing"
                  type="text"
                  value={form.routingNumber}
                  onChange={(e) => update("routingNumber", e.target.value)}
                  className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                  style={{ border: "1px solid #E0E0E0" }}
                />
                <p className="text-xs text-neutral-500">
                  9-digit routing number for US banks.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="account"
                  className="text-sm font-medium text-neutral-900"
                >
                  Account number
                </label>
                <input
                  id="account"
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) => update("accountNumber", e.target.value)}
                  className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                  style={{ border: "1px solid #E0E0E0" }}
                />
                <p className="text-xs text-neutral-500">
                  We&apos;ll never share your account number.
                </p>
              </div>
            </div>
          </div>

          <div
            className="my-6"
            style={{ borderTop: "1px solid #F0F0F0" }}
          />

          <h3 className="text-base font-bold text-neutral-900">
            Billing Address
          </h3>
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="billingMode"
                checked={form.billingMode === "same"}
                onChange={() => update("billingMode", "same")}
                className="mt-1 size-4 accent-neutral-900"
              />
              <div>
                <p className="text-sm text-neutral-900">
                  Same as my address in this account
                </p>
                <p className="text-xs text-neutral-500">{PROFILE_ADDRESS}</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="billingMode"
                checked={form.billingMode === "different"}
                onChange={() => update("billingMode", "different")}
                className="size-4 accent-neutral-900"
              />
              <span className="text-sm text-neutral-900">
                Different billing address
              </span>
            </label>

            {form.billingMode === "different" && (
              <div
                ref={differentFieldsRef}
                className="flex flex-col gap-5 pl-7"
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="street"
                    className="text-sm font-medium text-neutral-900"
                  >
                    Street address
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={form.street}
                    onChange={(e) => update("street", e.target.value)}
                    className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                    style={{ border: "1px solid #E0E0E0" }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="city"
                      className="text-sm font-medium text-neutral-900"
                    >
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                      style={{ border: "1px solid #E0E0E0" }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="state"
                      className="text-sm font-medium text-neutral-900"
                    >
                      State
                    </label>
                    <select
                      id="state"
                      value={form.state}
                      onChange={(e) => update("state", e.target.value)}
                      className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
                      style={{ border: "1px solid #E0E0E0" }}
                    >
                      {US_STATES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="zip"
                    className="text-sm font-medium text-neutral-900"
                  >
                    Zip Code
                  </label>
                  <input
                    id="zip"
                    type="text"
                    value={form.zip}
                    onChange={(e) => update("zip", e.target.value)}
                    className="w-full rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                    style={{ border: "1px solid #E0E0E0" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <footer
          className="flex items-center justify-end gap-3 px-8 py-5"
          style={{ borderTop: "1px solid #F0F0F0" }}
        >
          <Button variant="secondary" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!isValid}
            style={
              !isValid ? { opacity: 0.4, cursor: "not-allowed" } : undefined
            }
            onClick={handleSubmit}
          >
            Add Payment
          </Button>
        </footer>
      </div>
    </div>
  );
}

export function BuyerBankAccountPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
  const [addOpen, setAddOpen] = useState(false);

  const handleAdd = (form: FormState) => {
    const last4 = form.accountNumber.slice(-4) || "0000";
    setAccounts((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: `${form.bankName} ****${last4}`,
        expires: "Expires 12/30",
      },
    ]);
    setAddOpen(false);
  };

  const handleMakeDefault = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    );
  };

  const handleDelete = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col bg-neutral-50">
        <div className="flex items-center px-8 py-6">
          <h1 className="text-2xl font-bold text-neutral-900">Bank Account</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-6">
          <div className="flex flex-col gap-3">
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onMakeDefault={() => handleMakeDefault(account.id)}
                onEdit={() => setAddOpen(true)}
                onDelete={() => handleDelete(account.id)}
              />
            ))}

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-5 text-sm font-bold text-neutral-900 hover:bg-neutral-100"
              style={{ border: "1px dashed #D0D0D0" }}
            >
              <Plus className="size-5" />
              Add Bank Account
            </button>
          </div>
        </div>
      </div>

      <AddPaymentMethodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
      />
    </BuyerLayout>
  );
}
