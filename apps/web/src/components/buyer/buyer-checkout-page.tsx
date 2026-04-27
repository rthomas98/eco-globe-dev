"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Shield,
  Package,
  Truck,
  MapPin,
  Calendar,
  User,
  FileText,
  DollarSign,
  X,
  Plus,
  Building2,
  Check,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Button } from "@eco-globe/ui";

type Step = "shipping" | "payment" | "success";
type ShippingType = "pickup" | "delivery" | null;

interface PickupData {
  date: string;
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  plateNumber: string;
  notes: string;
}

interface DeliveryData {
  type: string;
  date: string;
  notes: string;
}

interface PaymentMethod {
  id: string;
  ownership: string;
  holder: string;
  bank: string;
  routing: string;
  account: string;
}

interface BillingAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

const product = {
  title: "Wood Sawdust Industrial High Quality",
  seller: "Shell Refinery Louisiana",
  qty: 20,
  unitPrice: 100,
  image: "/products/wood-shavings.png",
};

const pickupAddress = "1165 Bayou Paul Ln, St Gabriel, Baton rouge, 93264 LA";

/* ─── Reusable section card with header ─── */
function SectionCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      <div
        className="flex items-center gap-3 bg-neutral-50 px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-700"
      >
        <Icon className="size-4 text-neutral-500" />
        {label}
      </div>
      {children && <div className="px-5 py-5">{children}</div>}
    </div>
  );
}

function SubCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl" style={{ border: "1px solid #F0F0F0" }}>
      <div className="flex items-center gap-3 px-5 py-4">
        <div
          className="flex size-9 items-center justify-center rounded-lg bg-neutral-100"
        >
          <Icon className="size-4 text-neutral-700" />
        </div>
        <h3 className="text-base font-bold text-neutral-900">{label}</h3>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

/* ─── Modal shell ─── */
function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto ${wide ? "max-w-[760px]" : "max-w-[600px]"} rounded-2xl bg-white`}
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}
      >
        <div
          className="sticky top-0 flex items-center justify-between bg-white px-6 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
        {footer && (
          <div
            className="sticky bottom-0 flex items-center justify-end gap-3 bg-white px-6 py-4"
            style={{ borderTop: "1px solid #F0F0F0" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function FormInput({
  id,
  label,
  hint,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
        style={{ border: "1px solid #E0E0E0" }}
      />
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

function FormSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
        style={{ border: "1px solid #E0E0E0" }}
      >
        <option value="">-- Choose --</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Pickup form ─── */
function PickupForm({ data, onChange }: { data: PickupData; onChange: (d: PickupData) => void }) {
  const update = (k: keyof PickupData, v: string) => onChange({ ...data, [k]: v });

  return (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-3">
      {/* Pickup Location (display only) */}
      <SubCard icon={MapPin} label="Pickup Location">
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <span className="text-neutral-700">Facility name</span>
          <span className="text-neutral-900">Facility name</span>
          <span className="text-neutral-700">Full address</span>
          <span className="text-neutral-900">
            1165 Bayou Paul Ln, St Gabriel, Baton rouge, 93264 LA
          </span>
          <span className="text-neutral-700">Operating hours</span>
          <span className="text-neutral-900">09:00 AM - 09-00 PM</span>
        </div>
      </SubCard>

      {/* Pickup date */}
      <SubCard icon={Calendar} label="Pickup date">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-900">Select date</label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => update("date", e.target.value)}
            className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
            style={{ border: "1px solid #E0E0E0" }}
          />
        </div>
      </SubCard>

      {/* Pickup contact */}
      <SubCard icon={User} label="Pickup contact person">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            id="pu-fullName"
            label="Full name"
            value={data.fullName}
            onChange={(v) => update("fullName", v)}
          />
          <FormInput
            id="pu-phone"
            label="Phone number"
            value={data.phone}
            onChange={(v) => update("phone", v)}
          />
          <div className="sm:col-span-2">
            <FormInput
              id="pu-email"
              label="Email address"
              type="email"
              value={data.email}
              onChange={(v) => update("email", v)}
            />
          </div>
        </div>
      </SubCard>

      {/* Vehicle */}
      <SubCard icon={Truck} label="Vehicle details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            id="pu-vehicle"
            label="Vehicle type"
            value={data.vehicleType}
            onChange={(v) => update("vehicleType", v)}
            options={[
              { value: "flatbed", label: "Flatbed truck" },
              { value: "box-truck", label: "Box truck" },
              { value: "tanker", label: "Tanker" },
              { value: "container", label: "Container truck" },
            ]}
          />
          <FormInput
            id="pu-plate"
            label="Plate number"
            value={data.plateNumber}
            onChange={(v) => update("plateNumber", v)}
          />
        </div>
      </SubCard>

      {/* Notes */}
      <SubCard icon={FileText} label="Notes to seller">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-900">Notes</label>
          <textarea
            rows={4}
            placeholder="Enter your message..."
            value={data.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="w-full resize-none rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
            style={{ border: "1px solid #E0E0E0" }}
          />
        </div>
      </SubCard>
    </div>
  );
}

/* ─── Delivery form ─── */
function DeliveryForm({
  data,
  onChange,
  address,
  onChangeAddress,
  onAddAddress,
}: {
  data: DeliveryData;
  onChange: (d: DeliveryData) => void;
  address: BillingAddress | null;
  onChangeAddress: () => void;
  onAddAddress: () => void;
}) {
  const update = (k: keyof DeliveryData, v: string) => onChange({ ...data, [k]: v });

  return (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-3">
      <SubCard icon={MapPin} label="Delivery location">
        {address ? (
          <div
            className="flex items-center gap-4 rounded-xl bg-white px-4 py-3"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
              <MapPin className="size-4 text-neutral-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-neutral-900">{address.name}</p>
              <p className="truncate text-xs text-neutral-500">
                {address.street}, {address.city}, {address.zip} {address.state}
              </p>
            </div>
            <button
              onClick={onChangeAddress}
              className="text-sm font-bold text-neutral-900 underline"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={onAddAddress}
            className="flex items-center gap-2 text-sm font-bold text-neutral-900"
          >
            <Plus className="size-5" />
            Add delivery address
          </button>
        )}
      </SubCard>

      <SubCard icon={Truck} label="Delivery requirements">
        <div className="flex flex-col gap-4">
          <FormSelect
            id="dl-type"
            label="Delivery type"
            value={data.type}
            onChange={(v) => update("type", v)}
            options={[
              { value: "flatbed", label: "Flatbed truck" },
              { value: "box-truck", label: "Box truck" },
              { value: "tanker", label: "Tanker" },
              { value: "container", label: "Container truck" },
            ]}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-900">
              Select date <span className="text-neutral-400">(Optional)</span>
            </label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => update("date", e.target.value)}
              className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
              style={{ border: "1px solid #E0E0E0" }}
            />
          </div>
        </div>
      </SubCard>

      <SubCard icon={FileText} label="Notes to seller">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-900">Notes</label>
          <textarea
            rows={4}
            placeholder="Enter your message..."
            value={data.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="w-full resize-none rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
            style={{ border: "1px solid #E0E0E0" }}
          />
        </div>
      </SubCard>
    </div>
  );
}

/* ─── Add Payment Modal ─── */
function AddPaymentModal({
  initial,
  onSave,
  onClose,
}: {
  initial: PaymentMethod | null;
  onSave: (p: PaymentMethod) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<PaymentMethod>(
    initial ?? { id: "", ownership: "", holder: "", bank: "", routing: "", account: "" },
  );
  const update = (k: keyof PaymentMethod, v: string) => setData({ ...data, [k]: v });
  const valid =
    data.ownership && data.holder.trim() && data.bank.trim() && data.routing.trim() && data.account.trim();

  return (
    <Modal
      title="Add payment method"
      wide
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!valid}
            style={!valid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            onClick={() => onSave(data)}
          >
            Add Payment
          </Button>
        </>
      }
    >
      <h3 className="mb-4 text-base font-bold text-neutral-900">Account holder</h3>
      <div className="flex flex-col gap-4">
        <FormSelect
          id="pay-own"
          label="Account ownership type"
          value={data.ownership}
          onChange={(v) => update("ownership", v)}
          options={[
            { value: "individual", label: "Individual" },
            { value: "business", label: "Business" },
          ]}
        />
        <FormInput
          id="pay-holder"
          label="Account holder name"
          hint="Name as it appears on your bank account."
          value={data.holder}
          onChange={(v) => update("holder", v)}
        />
      </div>

      <div className="my-6" style={{ borderTop: "1px solid #F0F0F0" }} />

      <h3 className="mb-4 text-base font-bold text-neutral-900">Bank Details</h3>
      <div className="flex flex-col gap-4">
        <FormInput id="pay-bank" label="Bank name" value={data.bank} onChange={(v) => update("bank", v)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            id="pay-routing"
            label="Routing number (ABA)"
            hint="9-digit routing number for US banks."
            value={data.routing}
            onChange={(v) => update("routing", v)}
          />
          <FormInput
            id="pay-account"
            label="Account number"
            hint="We'll never share your account number."
            value={data.account}
            onChange={(v) => update("account", v)}
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Add Billing Address Modal ─── */
function AddBillingModal({
  initial,
  onSave,
  onClose,
}: {
  initial: BillingAddress | null;
  onSave: (b: BillingAddress) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<BillingAddress>(
    initial ?? { id: "", name: "Acme Company", street: "", city: "", state: "", zip: "" },
  );
  const update = (k: keyof BillingAddress, v: string) => setData({ ...data, [k]: v });
  const valid = data.street.trim() && data.city.trim() && data.state && data.zip.trim();

  return (
    <Modal
      title="Add Billing Address"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!valid}
            style={!valid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            onClick={() => onSave(data)}
          >
            Add Billing Address
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormInput
          id="bil-street"
          label="Street address"
          value={data.street}
          onChange={(v) => update("street", v)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput id="bil-city" label="City" value={data.city} onChange={(v) => update("city", v)} />
          <FormSelect
            id="bil-state"
            label="State"
            value={data.state}
            onChange={(v) => update("state", v)}
            options={[
              { value: "LA", label: "Louisiana" },
              { value: "TX", label: "Texas" },
              { value: "MS", label: "Mississippi" },
              { value: "AL", label: "Alabama" },
              { value: "FL", label: "Florida" },
            ]}
          />
        </div>
        <FormInput id="bil-zip" label="Zip Code" value={data.zip} onChange={(v) => update("zip", v)} />
      </div>
    </Modal>
  );
}

/* ─── Picker row with overflow menu ─── */
function PickerRow({
  icon: Icon,
  title,
  subtitle,
  selected,
  onChoose,
  onEdit,
  onDelete,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  selected: boolean;
  onChoose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 ${selected ? "" : ""}`}
      style={{
        border: selected ? "1.5px solid #378853" : "1px solid #E0E0E0",
      }}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
        <Icon className="size-4 text-neutral-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-bold text-neutral-900">{title}</p>
        <p className="truncate text-xs text-neutral-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {selected ? (
          <Check className="size-5 text-green-700" strokeWidth={3} />
        ) : (
          <button
            onClick={onChoose}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-neutral-900"
            style={{ border: "1px solid #090909" }}
          >
            Choose
          </button>
        )}
        <div ref={ref} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="More"
            className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-9 z-20 w-[160px] rounded-lg bg-white py-1"
              style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
            >
              <button
                onClick={() => { setMenuOpen(false); onEdit(); }}
                className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); }}
                className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Share
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BillingPickerModal({
  items,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: {
  items: BillingAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title="Billing address"
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        {items.map((b) => (
          <PickerRow
            key={b.id}
            icon={MapPin}
            title={b.name}
            subtitle={`${b.street}, ${b.city}, ${b.zip} ${b.state}`}
            selected={b.id === selectedId}
            onChoose={() => { onSelect(b.id); onClose(); }}
            onEdit={() => onEdit(b.id)}
            onDelete={() => onDelete(b.id)}
          />
        ))}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-1 py-2 text-left text-sm font-bold text-neutral-900"
        >
          <Plus className="size-4" />
          Add billing address
        </button>
      </div>
    </Modal>
  );
}

function PaymentPickerModal({
  items,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: {
  items: PaymentMethod[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title="Payment methods"
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        {items.map((p) => (
          <PickerRow
            key={p.id}
            icon={Building2}
            title={`${p.bank || "US Bank Account"} ****${p.account.slice(-4)}`}
            subtitle={`Expires 10/26 · ${p.holder}`}
            selected={p.id === selectedId}
            onChoose={() => { onSelect(p.id); onClose(); }}
            onEdit={() => onEdit(p.id)}
            onDelete={() => onDelete(p.id)}
          />
        ))}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-1 py-2 text-left text-sm font-bold text-neutral-900"
        >
          <Plus className="size-4" />
          Add payment method
        </button>
      </div>
    </Modal>
  );
}

export function BuyerCheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("shipping");
  const [shippingType, setShippingType] = useState<ShippingType>(null);
  const [pickup, setPickup] = useState<PickupData>({
    date: "",
    fullName: "",
    phone: "",
    email: "",
    vehicleType: "",
    plateNumber: "",
    notes: "",
  });
  const [delivery, setDelivery] = useState<DeliveryData>({
    type: "",
    date: "",
    notes: "",
  });
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(null);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);

  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [billings, setBillings] = useState<BillingAddress[]>([
    {
      id: "addr-2",
      name: "Acme Company",
      street: "400 Concourse Blvd NE",
      city: "Atlanta",
      state: "GA",
      zip: "30308",
    },
  ]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddBilling, setShowAddBilling] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingBillingId, setEditingBillingId] = useState<string | null>(null);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showBillingPicker, setShowBillingPicker] = useState(false);

  const payment = payments.find((p) => p.id === selectedPaymentId) ?? null;
  const billing = billings.find((b) => b.id === selectedBillingId) ?? null;

  const deliveryAddress = billings.find((b) => b.id === deliveryAddressId) ?? null;

  const itemSubtotal = product.qty * product.unitPrice;
  const subtotal = itemSubtotal;

  const canContinueShipping =
    (shippingType === "pickup") ||
    (shippingType === "delivery" && deliveryAddress !== null);
  const canConfirmOrder = payment !== null && billing !== null;

  const primaryButtonLabel =
    step === "shipping"
      ? shippingType === "delivery"
        ? "Product Confirmed"
        : "Payment"
      : "Confirm Order";

  const handlePrimary = () => {
    if (step === "shipping" && canContinueShipping) {
      if (shippingType === "delivery") {
        setOrderId(`EG-${Math.floor(20000 + Math.random() * 80000)}`);
        setStep("success");
      } else {
        setStep("payment");
      }
    } else if (step === "payment" && canConfirmOrder) {
      setOrderId(`EG-${Math.floor(20000 + Math.random() * 80000)}`);
      setStep("success");
    } else if (step === "success") router.push("/buyer/browse");
  };

  if (step === "success") {
    const isPickup = shippingType === "pickup";
    const summaryRows = isPickup
      ? [
          { label: "Order ID", value: orderId ?? "" },
          { label: "Seller", value: product.seller },
          { label: "Product", value: product.title },
          { label: "Quantity", value: `${product.qty} tons` },
          { label: "Shipping method", value: "Pickup" },
          { label: "Pickup location", value: pickupAddress },
          { label: "Pickup date", value: pickup.date || "Requested" },
          { label: "Status", value: "Awaiting seller confirmation" },
        ]
      : [
          { label: "Order ID", value: orderId ?? "" },
          { label: "Seller", value: product.seller },
          { label: "Product", value: product.title },
          { label: "Quantity", value: `${product.qty} tons` },
          { label: "Shipping method", value: "Delivery (Quote required)" },
          { label: "Shipping cost", value: "Pending seller quote" },
          { label: "Status", value: "Awaiting shipping quote" },
        ];

    const heroDescription = isPickup
      ? "The seller will confirm your order and pickup details. Once confirmed, you can prepare your pickup."
      : "The seller will send a delivery quote for your approval. Once you approve the shipping cost, you'll be able to fund escrow and start processing.";

    const footerText = isPickup
      ? "You'll receive a notification when the seller confirms pickup availability."
      : "You'll receive a notification when the quote is ready";

    return (
      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/buyer/browse">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={110}
              height={32}
              className="invert"
              priority
            />
          </Link>
          <Link
            href="/buyer/browse"
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          >
            <X className="size-5" />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-10">
          <div className="flex w-full max-w-[560px] flex-col items-center text-center">
            <span className="mb-6 text-6xl">📦</span>
            <h1 className="mb-3 text-3xl font-bold text-neutral-900 sm:text-4xl">
              Your order is submitted
            </h1>
            <p className="mb-8 max-w-[440px] whitespace-pre-line text-base text-neutral-500">
              {heroDescription}
            </p>

            <div
              className="mb-6 w-full overflow-hidden rounded-2xl bg-neutral-50"
              style={{ border: "1px solid #F0F0F0" }}
            >
              <button
                type="button"
                onClick={() => setSummaryOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-lg font-bold text-neutral-900">Order Summary</span>
                {summaryOpen ? (
                  <ChevronUp className="size-5 text-neutral-700" />
                ) : (
                  <ChevronDown className="size-5 text-neutral-700" />
                )}
              </button>
              {summaryOpen && (
                <div
                  className="px-6 pb-5 pt-1 text-left"
                  style={{ borderTop: "1px solid #F0F0F0" }}
                >
                  <dl className="grid grid-cols-[160px_24px_1fr] gap-y-3 pt-4 text-sm">
                    {summaryRows.map((row) => (
                      <div key={row.label} className="contents">
                        <dt className="text-neutral-500">{row.label}</dt>
                        <dd className="text-neutral-500">:</dd>
                        <dd className="text-neutral-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            <p className="mb-6 text-sm text-neutral-500">{footerText}</p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/buyer/orders">
                <Button variant="secondary" size="md">
                  View Detail
                </Button>
              </Link>
              <Link href="/buyer/browse">
                <Button variant="secondary" size="md">
                  Back to Search
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100">
      {/* Header */}
      <header
        className="flex h-16 items-center justify-between bg-white px-6 sm:px-10"
        style={{ borderBottom: "1px solid #F0F0F0" }}
      >
        <Link href="/buyer/browse">
          <Image
            src="/logo.svg"
            alt="EcoGlobe"
            width={110}
            height={32}
            className="invert"
            priority
          />
        </Link>
        <div
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
          style={{ border: "1px solid #E0E0E0" }}
        >
          <Shield className="size-4" />
          Secure
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 p-6 lg:flex-row lg:p-10">
        {/* Left — checkout sections */}
        <div className="flex flex-1 flex-col gap-5">
          <>
              {/* Product */}
              <SectionCard icon={Package} label="Product">
                <div className="flex items-center gap-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <img src={product.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-neutral-900">{product.title}</p>
                    <p className="text-sm text-neutral-500">
                      {product.qty} x ${product.unitPrice}
                    </p>
                  </div>
                </div>
              </SectionCard>

              {step === "shipping" && (
                <div
                  className="overflow-hidden rounded-2xl bg-white"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex items-center gap-3 bg-neutral-50 px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-700">
                    <Truck className="size-4 text-neutral-500" />
                    Shipping
                  </div>
                  <div className="px-5 pt-5">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setShippingType("pickup")}
                        className={`flex items-center gap-3 rounded-lg px-5 py-3.5 text-sm font-bold transition-colors ${
                          shippingType === "pickup"
                            ? "bg-white text-neutral-900"
                            : "bg-white text-neutral-900 hover:bg-neutral-50"
                        }`}
                        style={{
                          border:
                            shippingType === "pickup"
                              ? "1.5px solid #378853"
                              : "1px solid #E0E0E0",
                        }}
                      >
                        <span
                          className="flex size-5 items-center justify-center rounded-full"
                          style={{
                            border:
                              shippingType === "pickup"
                                ? "1.5px solid #378853"
                                : "1.5px solid #C0C0C0",
                          }}
                        >
                          {shippingType === "pickup" && (
                            <span className="size-2.5 rounded-full bg-green-700" />
                          )}
                        </span>
                        Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setShippingType("delivery")}
                        className={`flex items-center gap-3 rounded-lg px-5 py-3.5 text-sm font-bold transition-colors ${
                          shippingType === "delivery"
                            ? "bg-white text-neutral-900"
                            : "bg-white text-neutral-900 hover:bg-neutral-50"
                        }`}
                        style={{
                          border:
                            shippingType === "delivery"
                              ? "1.5px solid #378853"
                              : "1px solid #E0E0E0",
                        }}
                      >
                        <span
                          className="flex size-5 items-center justify-center rounded-full"
                          style={{
                            border:
                              shippingType === "delivery"
                                ? "1.5px solid #378853"
                                : "1.5px solid #C0C0C0",
                          }}
                        >
                          {shippingType === "delivery" && (
                            <span className="size-2.5 rounded-full bg-green-700" />
                          )}
                        </span>
                        Delivery
                      </button>
                    </div>
                  </div>
                  {shippingType === "pickup" && (
                    <PickupForm data={pickup} onChange={setPickup} />
                  )}
                  {shippingType === "delivery" && (
                    <DeliveryForm
                      data={delivery}
                      onChange={setDelivery}
                      address={deliveryAddress}
                      onChangeAddress={() => setShowDeliveryPicker(true)}
                      onAddAddress={() => setShowDeliveryPicker(true)}
                    />
                  )}
                </div>
              )}

              {step === "payment" && (
                <>
                  <SectionCard icon={DollarSign} label="Payment">
                    {payment ? (
                      <div
                        className="flex items-center gap-4 rounded-xl px-4 py-3"
                        style={{ border: "1px solid #F0F0F0" }}
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                          <Building2 className="size-4 text-neutral-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-bold text-neutral-900">
                            {payment.bank || "US Bank Account"} ****{payment.account.slice(-4)}
                          </p>
                          <p className="truncate text-xs text-neutral-500">Expires 10/26</p>
                        </div>
                        <button
                          onClick={() => setShowPaymentPicker(true)}
                          className="text-sm font-bold text-neutral-900 underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPaymentId(null);
                          setShowAddPayment(true);
                        }}
                        className="flex items-center gap-2 text-sm font-bold text-neutral-900"
                      >
                        <Plus className="size-5" />
                        Add Payment
                      </button>
                    )}
                  </SectionCard>

                  <SectionCard icon={MapPin} label="Billing Address">
                    {billing ? (
                      <div
                        className="flex items-center gap-4 rounded-xl px-4 py-3"
                        style={{ border: "1px solid #F0F0F0" }}
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                          <MapPin className="size-4 text-neutral-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-bold text-neutral-900">
                            {billing.name}
                          </p>
                          <p className="truncate text-xs text-neutral-500">
                            {billing.street}, {billing.city}, {billing.zip} {billing.state}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowBillingPicker(true)}
                          className="text-sm font-bold text-neutral-900 underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingBillingId(null);
                          setShowAddBilling(true);
                        }}
                        className="flex items-center gap-2 text-sm font-bold text-neutral-900"
                      >
                        <Plus className="size-5" />
                        Add Billing Address
                      </button>
                    )}
                  </SectionCard>
                </>
              )}
            </>
        </div>

        {/* Right — summary */}
        <aside className="w-full lg:w-[360px] shrink-0">
          <div
            className="sticky top-6 rounded-2xl bg-white p-6"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <h2 className="text-2xl font-bold text-neutral-900">Summary</h2>
            <p
              className="mt-1 pb-4 text-sm text-neutral-500"
              style={{ borderBottom: "1px solid #F0F0F0" }}
            >
              1 product
            </p>

            <div
              className="flex flex-col gap-3 py-4"
              style={{ borderBottom: "1px solid #F0F0F0" }}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">Item subtotal</span>
                <span className="font-medium text-neutral-900">${itemSubtotal.toFixed(2)}</span>
              </div>
              {shippingType !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">Shipping</span>
                  <span className="font-medium text-neutral-900">
                    {shippingType === "delivery" ? "To be negotiated" : "0"}
                  </span>
                </div>
              )}
            </div>

            <div className="my-4 flex items-center justify-between text-base font-bold">
              <span className="text-neutral-900">Subtotal</span>
              <span className="text-neutral-900">${subtotal.toFixed(2)}</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={
                (step === "shipping" && !canContinueShipping) ||
                (step === "payment" && !canConfirmOrder)
              }
              style={
                (step === "shipping" && !canContinueShipping) ||
                (step === "payment" && !canConfirmOrder)
                  ? { opacity: 0.4, cursor: "not-allowed" }
                  : undefined
              }
              onClick={handlePrimary}
            >
              {primaryButtonLabel}
            </Button>
          </div>

          {shippingType === "delivery" && step === "shipping" && (
            <div
              className="mt-4 flex gap-3 rounded-2xl bg-white p-5"
              style={{ border: "1px solid #F0F0F0" }}
            >
              <Info className="mt-0.5 size-5 shrink-0 text-neutral-700" />
              <div className="flex flex-col gap-3 text-sm">
                <p className="font-bold text-neutral-900">
                  Delivery requires a shipping quote
                </p>
                <p className="text-neutral-500">
                  The seller will create a shipping quote when your order will be placed
                </p>
                <p className="text-neutral-500">
                  Escrow funding will be available only after both parties approve the shipping
                  cost.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {showAddPayment && (
        <AddPaymentModal
          initial={editingPaymentId ? payments.find((p) => p.id === editingPaymentId) ?? null : null}
          onClose={() => setShowAddPayment(false)}
          onSave={(p) => {
            if (editingPaymentId) {
              setPayments((prev) => prev.map((x) => (x.id === editingPaymentId ? { ...p, id: editingPaymentId } : x)));
            } else {
              const id = `pay-${Date.now()}`;
              setPayments((prev) => [...prev, { ...p, id }]);
              if (!selectedPaymentId) setSelectedPaymentId(id);
            }
            setShowAddPayment(false);
            setEditingPaymentId(null);
          }}
        />
      )}
      {showAddBilling && (
        <AddBillingModal
          initial={editingBillingId ? billings.find((b) => b.id === editingBillingId) ?? null : null}
          onClose={() => setShowAddBilling(false)}
          onSave={(b) => {
            if (editingBillingId) {
              setBillings((prev) => prev.map((x) => (x.id === editingBillingId ? { ...b, id: editingBillingId } : x)));
            } else {
              const id = `addr-${Date.now()}`;
              setBillings((prev) => [...prev, { ...b, id }]);
              if (!selectedBillingId) setSelectedBillingId(id);
            }
            setShowAddBilling(false);
            setEditingBillingId(null);
          }}
        />
      )}
      {showPaymentPicker && (
        <PaymentPickerModal
          items={payments}
          selectedId={selectedPaymentId}
          onSelect={setSelectedPaymentId}
          onAdd={() => {
            setShowPaymentPicker(false);
            setEditingPaymentId(null);
            setShowAddPayment(true);
          }}
          onEdit={(id) => {
            setShowPaymentPicker(false);
            setEditingPaymentId(id);
            setShowAddPayment(true);
          }}
          onDelete={(id) => {
            setPayments((prev) => prev.filter((p) => p.id !== id));
            if (selectedPaymentId === id) setSelectedPaymentId(null);
          }}
          onClose={() => setShowPaymentPicker(false)}
        />
      )}
      {showDeliveryPicker && (
        <BillingPickerModal
          items={billings}
          selectedId={deliveryAddressId}
          onSelect={setDeliveryAddressId}
          onAdd={() => {
            setShowDeliveryPicker(false);
            setEditingBillingId(null);
            setShowAddBilling(true);
          }}
          onEdit={(id) => {
            setShowDeliveryPicker(false);
            setEditingBillingId(id);
            setShowAddBilling(true);
          }}
          onDelete={(id) => {
            setBillings((prev) => prev.filter((b) => b.id !== id));
            if (deliveryAddressId === id) setDeliveryAddressId(null);
          }}
          onClose={() => setShowDeliveryPicker(false)}
        />
      )}
      {showBillingPicker && (
        <BillingPickerModal
          items={billings}
          selectedId={selectedBillingId}
          onSelect={setSelectedBillingId}
          onAdd={() => {
            setShowBillingPicker(false);
            setEditingBillingId(null);
            setShowAddBilling(true);
          }}
          onEdit={(id) => {
            setShowBillingPicker(false);
            setEditingBillingId(id);
            setShowAddBilling(true);
          }}
          onDelete={(id) => {
            setBillings((prev) => prev.filter((b) => b.id !== id));
            if (selectedBillingId === id) setSelectedBillingId(null);
          }}
          onClose={() => setShowBillingPicker(false)}
        />
      )}
    </div>
  );
}
