"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart, type CartItem } from "@/components/cart/cart-context";
import { formatMoney, formatQuantityWithUnitName } from "@/lib/listing-format";
import { checkoutAttemptKey, clearCheckoutAttemptKey, clearCheckoutAttemptKeyValue, startCheckout } from "@/lib/api-orders";
import {
  clearPendingCheckout,
  readPendingCheckout,
  savePendingCheckout,
  type PendingCheckout,
  type PendingCheckoutRequest,
} from "@/lib/checkout-pending";
import { pendingScopeKey } from "@/lib/checkout-pending-core";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import { sampleApi } from "@/lib/api-sample-shipping";
import { takeSampleConversion, updateSampleRequest } from "@/lib/api-samples";
import { readDemoUser, useDemoUser } from "@/lib/demo-user";
import { useCompanyLocations } from "@/lib/use-company-locations";
import {
  Shield,
  Package,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  X,
  Plus,
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
  /** Preferred start time, "HH:MM" local. */
  timeRange: string;
}

interface BillingAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

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
function PickupForm({
  data,
  onChange,
  location,
}: {
  data: PickupData;
  onChange: (d: PickupData) => void;
  location: string;
}) {
  const update = (k: keyof PickupData, v: string) => onChange({ ...data, [k]: v });

  return (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-3">
      {/* Pickup location comes from the listing record */}
      <SubCard icon={MapPin} label="Pickup Location">
        <p className="text-sm text-neutral-900">{location}</p>
        <p className="mt-1 text-xs text-neutral-500">
          The seller confirms the exact facility and hours after payment.
        </p>
      </SubCard>

      {/* Requested pickup date (sent with the order) */}
      <SubCard icon={Calendar} label="Requested pickup date">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="pu-date" className="text-sm font-medium text-neutral-900">
              Select date <span className="text-neutral-400">(Optional)</span>
            </label>
            <input
              id="pu-date"
              type="date"
              value={data.date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => update("date", e.target.value)}
              className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
              style={{ border: "1px solid #E0E0E0" }}
            />
          </div>
          <FormSelect
            id="pu-time-range"
            label="Preferred start time"
            value={data.timeRange}
            onChange={(v) => update("timeRange", v)}
            options={[
              { value: "09:00", label: "Morning (from 9:00 AM)" },
              { value: "12:00", label: "Midday (from 12:00 PM)" },
              { value: "15:00", label: "Afternoon (from 3:00 PM)" },
            ]}
          />
        </div>
      </SubCard>
    </div>
  );
}

/* ─── Delivery form ─── */
function DeliveryForm({
  address,
  onChangeAddress,
  onAddAddress,
}: {
  address: BillingAddress | null;
  onChangeAddress: () => void;
  onAddAddress: () => void;
}) {
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
                {address.street}, {address.city}, {address.state} {address.zip}, {address.country}
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
        <p className="mt-2 text-xs text-neutral-500">
          Freight is arranged separately after payment; delivery dates are agreed then.
        </p>
      </SubCard>
    </div>
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
  const initialUsesCustomState =
    !!initial?.state && !["LA", "TX", "MS", "AR", "GA", "AL", "FL"].includes(initial.state);
  const initialUsesCustomCountry =
    !!initial?.country &&
    !["US", "Spain", "France", "Netherlands", "Mexico", "Brazil", "Saudi Arabia"].includes(
      initial.country,
    );
  const [data, setData] = useState<BillingAddress>(
    initial ?? { id: "", name: "", street: "", city: "", state: "", zip: "", country: "" },
  );
  const [stateMode, setStateMode] = useState(initialUsesCustomState ? "other" : initial?.state ?? "");
  const [customState, setCustomState] = useState(initialUsesCustomState ? initial.state : "");
  const [countryMode, setCountryMode] = useState(
    initialUsesCustomCountry ? "other" : initial?.country ?? "",
  );
  const [customCountry, setCustomCountry] = useState(
    initialUsesCustomCountry ? initial.country : "",
  );
  const update = (k: keyof BillingAddress, v: string) => setData({ ...data, [k]: v });
  const valid = data.street.trim() && data.city.trim() && data.state && data.zip.trim() && data.country;

  return (
    <Modal
      title="Add delivery address"
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
            Add delivery address
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
            value={stateMode}
            onChange={(v) => {
              setStateMode(v);
              update("state", v === "other" ? customState : v);
            }}
            options={[
              { value: "LA", label: "Louisiana" },
              { value: "TX", label: "Texas" },
              { value: "MS", label: "Mississippi" },
              { value: "AR", label: "Arkansas" },
              { value: "GA", label: "Georgia" },
              { value: "AL", label: "Alabama" },
              { value: "FL", label: "Florida" },
              { value: "other", label: "Other / type below" },
            ]}
          />
        </div>
        {stateMode === "other" && (
          <FormInput
            id="bil-state-other"
            label="Type state"
            value={customState}
            onChange={(v) => {
              setCustomState(v);
              update("state", v);
            }}
          />
        )}
        <FormSelect
          id="bil-country"
          label="Country"
          value={countryMode}
          onChange={(v) => {
            setCountryMode(v);
            update("country", v === "other" ? customCountry : v);
          }}
          options={[
            { value: "US", label: "US" },
            { value: "Spain", label: "Spain" },
            { value: "France", label: "France" },
            { value: "Netherlands", label: "Netherlands" },
            { value: "Mexico", label: "Mexico" },
            { value: "Brazil", label: "Brazil" },
            { value: "Saudi Arabia", label: "Saudi Arabia" },
            { value: "other", label: "Other / type below" },
          ]}
        />
        {countryMode === "other" && (
          <FormInput
            id="bil-country-other"
            label="Type country"
            value={customCountry}
            onChange={(v) => {
              setCustomCountry(v);
              update("country", v);
            }}
          />
        )}
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
      title="Delivery address"
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        {items.map((b) => (
          <PickerRow
            key={b.id}
            icon={MapPin}
            title={b.name}
            subtitle={`${b.street}, ${b.city}, ${b.state} ${b.zip}, ${b.country}`}
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
          Add delivery address
        </button>
      </div>
    </Modal>
  );
}

/** Every cart item, each checked out and paid as its own order. */
function CartCheckoutOverview({ items, currentId }: { items: CartItem[]; currentId?: string }) {
  const user = useDemoUser();
  const scope = pendingScopeKey(user?.id, user?.activeCompanyId);
  const [pendingIds, setPendingIds] = useState<{ scope: string | null; ids: Record<string, number> }>({ scope: null, ids: {} });
  useEffect(() => {
    setPendingIds({
      scope,
      ids: scope
        ? Object.fromEntries(items.map((i) => [i.id, readPendingCheckout(i.id)?.orderId ?? 0]).filter(([, id]) => id))
        : {},
    });
  }, [items, scope]);
  const pendingFor = pendingIds.scope === scope ? pendingIds.ids : {};
  if (items.length < 2) return null;
  return (
    <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }} aria-label="Cart items">
      <p className="text-sm font-bold text-neutral-900">Your cart has {items.length} items</p>
      <p className="mt-1 text-xs text-neutral-500">
        Each item is a separate order with its own payment. Items stay in your cart until Stripe confirms payment.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => {
          const current = item.id === currentId;
          const pendingOrder = pendingFor[item.id];
          return (
            <li key={item.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${current ? "bg-neutral-100" : "bg-neutral-50"}`}>
              <span className="min-w-0">
                <span className="font-semibold text-neutral-900">{item.title}</span>{" "}
                <span className="text-neutral-500">
                  · {formatQuantityWithUnitName(item.quantity, item.quantityUnit) ?? item.quantity}
                  {pendingOrder ? ` · unpaid order EG-${pendingOrder}` : ""}
                </span>
              </span>
              {current ? (
                <span className="text-xs font-semibold text-neutral-700">Checking out now</span>
              ) : (
                <Link href={`/buyer/checkout?listing=${encodeURIComponent(item.id)}`} className="text-xs font-semibold text-neutral-900 underline">
                  {pendingOrder ? "Continue payment" : "Check out this item"}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function BuyerCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, removeItem } = useCart();
  // Checkout is bounded to one persisted listing: the one handed over from the
  // detail page when present, otherwise the first cart item. No invented product.
  const requestedId = searchParams.get("listing");
  // An explicitly requested listing that is not in the cart must never be
  // substituted with a different item; only an unqualified visit uses the first item.
  // After payment the item leaves the cart; this snapshot keeps the success
  // view rendering for the order that was just paid.
  const [paidItem, setPaidItem] = useState<CartItem | null>(null);
  const cartItem = paidItem ?? (requestedId ? items.find((i) => i.id === requestedId) : items[0]);
  const requestedMissing = !paidItem && !!requestedId && !cartItem;
  // An unpaid order already started for this cart item is resumed with its
  // saved request and key, never duplicated by a new attempt.
  // Pending state is tagged with the user/company it was read for; after a
  // company switch it is ignored in the same render, before effects re-read.
  const sessionUser = useDemoUser();
  const pendingScope = pendingScopeKey(sessionUser?.id, sessionUser?.activeCompanyId);
  const [pendingState, setPendingState] = useState<{ scope: string | null; entry: PendingCheckout | null }>({
    scope: null,
    entry: null,
  });
  const pending = pendingState.scope !== null && pendingState.scope === pendingScope ? pendingState.entry : null;
  const setPending = (entry: PendingCheckout | null) => setPendingState({ scope: pendingScope, entry });
  const cartItemId = cartItem?.id;
  useEffect(() => {
    if (paidItem) return;
    setPendingState({
      scope: pendingScope,
      entry: cartItemId && pendingScope ? readPendingCheckout(cartItemId) : null,
    });
  }, [cartItemId, paidItem, pendingScope]);
  const product = cartItem
    ? {
        id: cartItem.id,
        title: cartItem.title,
        seller: cartItem.sellerName ?? "Seller name unavailable",
        location: cartItem.location,
        // A saved unpaid order keeps its own quantity, whatever the cart now says.
        qty: pending?.request.quantity ?? cartItem.quantity,
        unitPrice: cartItem.price,
        currencyCode: cartItem.currencyCode,
        unit: cartItem.unit,
        quantityUnit: cartItem.quantityUnit,
        moq: cartItem.moq,
        available: cartItem.available,
        image: cartItem.image,
      }
    : null;
  // Pickup happens at the seller's recorded facility for this listing; no address is invented.
  const pickupAddress = product?.location || "Seller facility (address on file with the listing)";
  const [step, setStep] = useState<Step>("shipping");
  const [shippingType, setShippingType] = useState<ShippingType>(null);
  const [pickup, setPickup] = useState<PickupData>({ date: "", timeRange: "" });
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(null);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);

  // Delivery addresses start from the buyer company's persisted facilities;
  // any address added here is only sent with this order, never stored locally.
  const [buyerCompanyIdForLocations, setBuyerCompanyIdForLocations] = useState<number>();
  useEffect(() => setBuyerCompanyIdForLocations(readDemoUser()?.activeCompanyId), []);
  const companyLocations = useCompanyLocations(buyerCompanyIdForLocations);
  const [billings, setBillings] = useState<BillingAddress[]>([]);
  useEffect(() => {
    if (companyLocations.status !== "ready") return;
    setBillings((prev) => {
      const persisted = companyLocations.locations.map((location) => ({
        id: `loc-${location.id}`,
        name: location.name,
        street: location.addressLine1 ?? "",
        city: location.city ?? "",
        state: location.stateProvince ?? "",
        zip: location.postalCode ?? "",
        country: location.countryCode ?? "",
      }));
      const entered = prev.filter((b) => !b.id.startsWith("loc-"));
      return [...persisted, ...entered];
    });
  }, [companyLocations.status, companyLocations.locations]);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [showAddBilling, setShowAddBilling] = useState(false);
  const [editingBillingId, setEditingBillingId] = useState<string | null>(null);


  const deliveryAddress = billings.find((b) => b.id === deliveryAddressId) ?? null;

  const [sampleCreditCents, setSampleCreditCents] = useState(0);
  const sampleListingId = cartItem?.id;
  useEffect(() => { let active = true; setSampleCreditCents(0); if (sampleListingId) sampleApi<{cents:number}>(`/credits?listingId=${sampleListingId}`).then(r => {if(active)setSampleCreditCents(r.cents);}).catch(() => {}); return () => {active=false;}; }, [sampleListingId]);
  const itemSubtotal = product ? product.qty * product.unitPrice : 0;
  // Estimate only: checkout applies the credit transactionally and leaves the
  // provider minimum (USD 0.50) to be charged online.
  const sampleCredit = product?.currencyCode === "USD" ? Math.min(sampleCreditCents / 100, Math.max(0, itemSubtotal - 0.5)) : 0;
  const subtotal = itemSubtotal - sampleCredit;
  const money = (n: number) => (product ? (formatMoney(n, product.currencyCode) ?? "—") : "—");
  const quantityLabel = product ? (formatQuantityWithUnitName(product.qty, product.quantityUnit) ?? String(product.qty)) : "";

  const canContinueShipping =
    (shippingType === "pickup") ||
    (shippingType === "delivery" && deliveryAddress !== null);
  // No payment details are collected here, so confirming only needs a product.
  const canConfirmOrder = true;

  const primaryButtonLabel = pending
    ? "Continue payment"
    : step === "shipping"
      ? "Continue to payment"
      : "Confirm and pay";

  // One idempotency key per unchanged checkout attempt, so a retry after a
  // network failure resumes the same order instead of creating another.
  const pickupRequestedAt =
    shippingType === "pickup" && pickup.date
      ? new Date(`${pickup.date}T${pickup.timeRange || "09:00"}:00`).toISOString()
      : undefined;
  const attemptSignature = JSON.stringify([
    cartItem?.id,
    cartItem?.quantity,
    shippingType,
    deliveryAddressId,
    pickupRequestedAt,
  ]);

  // Starts provider-confirmed checkout. The order is only paid when Stripe
  // confirms it; this page never records a payment or funds escrow.
  const finalizeOrder = async () => {
    if (placing || !cartItem || (!pending && !shippingType)) return;
    const listingId = Number(cartItem.id);
    if (!Number.isInteger(listingId) || listingId <= 0) {
      setPlaceError("This cart item is not a saved listing. Open the listing and use Buy Now again.");
      return;
    }
    if (!readDemoUser()?.activeCompanyId) {
      setPlaceError("Sign in with your buyer company to place this order. Your cart is kept.");
      return;
    }
    // Re-read the saved order for the current session right before submitting,
    // so an entry read for a previous user/company can never be sent.
    const livePending = readPendingCheckout(cartItem.id);
    if (pending && (!livePending || livePending.orderId !== pending.orderId)) {
      setPending(livePending);
      setPlaceError("Your account or company changed. Review this checkout again before paying.");
      return;
    }
    setPlacing(true);
    setPlaceError("");
    try {
      const address = deliveryAddress
        ? [deliveryAddress.street, deliveryAddress.city, deliveryAddress.state, deliveryAddress.zip, deliveryAddress.country]
            .filter(Boolean)
            .join(", ")
        : undefined;
      const request: PendingCheckoutRequest = livePending?.request ?? {
        listingId,
        quantity: cartItem.quantity,
        idempotencyKey: checkoutAttemptKey(attemptSignature),
        deliveryMethod: shippingType ?? "pickup",
        deliveryAddress: shippingType === "delivery" ? address : undefined,
        pickupRequestedAt,
      };
      const result = await startCheckout(request);
      // If this purchase started from a received sample ("Order in bulk"),
      // link the order back so both sides see the conversion.
      const conversion = takeSampleConversion(listingId);
      if (conversion) {
        await updateSampleRequest(conversion.sampleId, {
          convertedOrderId: result.orderId,
        }).catch(() => {
          // The order exists either way; the link is best-effort.
        });
      }
      setOrderId(`EG-${result.orderId}`);
      if (result.payment?.checkoutUrl) {
        // The item stays in the cart until Stripe confirms payment; the saved
        // request lets a refresh or return resume this same order. Other cart
        // items are untouched.
        savePendingCheckout({ cartItemId: cartItem.id, orderId: result.orderId, request, createdAt: Date.now() });
        window.location.assign(result.payment.checkoutUrl);
        return;
      }
      if (result.status === "paid") {
        clearCheckoutAttemptKey(attemptSignature);
        clearPendingCheckout(cartItem.id);
        if (livePending) {
          // The success summary shows the saved order's details.
          setShippingType(livePending.request.deliveryMethod);
          if (livePending.request.pickupRequestedAt) {
            const at = new Date(livePending.request.pickupRequestedAt);
            setPickup({
              date: `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`,
              timeRange: `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`,
            });
          }
          setPending(null);
        }
        setPaidItem({ ...cartItem, quantity: request.quantity });
        removeItem(cartItem.id);
        setStep("success");
        return;
      }
      setPlaceError(
        result.status === "expired"
          ? "This checkout expired before payment. Start checkout again."
          : "The payment page could not be opened. Please try again.",
      );
      if (result.status === "expired") {
        // Clear both the saved order and the key it used, so the next attempt
        // really starts a new checkout.
        clearCheckoutAttemptKey(attemptSignature);
        clearCheckoutAttemptKeyValue(request.idempotencyKey);
        clearPendingCheckout(cartItem.id);
        setPending(null);
      }
    } catch (error) {
      setPlaceError(
        isBackendApiError(error) && error.status === 503
          ? `${error.message} Your cart is kept and nothing was charged.`
          : describeBackendError(error, "Unable to start checkout. Nothing was charged; please try again."),
      );
    } finally {
      setPlacing(false);
    }
  };

  const handlePrimary = () => {
    if (pending && step !== "success") void finalizeOrder();
    else if (step === "shipping" && canContinueShipping) setStep("payment");
    else if (step === "payment" && canConfirmOrder) void finalizeOrder();
    else if (step === "success") router.push("/buyer/orders");
  };


  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-100 px-6 text-center">
        <p className="text-lg font-bold text-neutral-900">{requestedMissing ? "That listing is not in your cart" : "Nothing to check out"}</p>
        <p className="max-w-[420px] text-sm text-neutral-600">
          {requestedMissing
            ? `Listing ${requestedId} was requested but is not in your cart, so nothing else was substituted. Open the listing and use Buy Now again.`
            : "Choose a listing and use Buy Now or Add to Cart; checkout only shows the real listing you selected."}
        </p>
        <div className="flex gap-3">
          {requestedMissing && <Link href={`/buyer/browse/${encodeURIComponent(requestedId ?? "")}`}><Button variant="secondary" size="md">Open listing</Button></Link>}
          <Link href="/buyer/browse"><Button variant="primary" size="md">Browse listings</Button></Link>
        </div>
      </div>
    );
  }

  if (step === "success") {
    const isPickup = shippingType === "pickup";
    const summaryRows = isPickup
      ? [
          { label: "Order reference", value: orderId ?? "" },
          { label: "Seller", value: product.seller },
          { label: "Product", value: product.title },
          { label: "Quantity", value: quantityLabel },
          { label: "Unit price", value: `${money(product.unitPrice)}${product.unit}` },
          { label: "Item subtotal", value: money(itemSubtotal) },
          { label: "Shipping method", value: "Pickup" },
          { label: "Pickup location", value: pickupAddress },
          { label: "Requested pickup date", value: pickup.date || "Not specified" },
          { label: "Preferred start time", value: pickup.timeRange || "Not specified" },
          { label: "Status", value: "Paid — awaiting seller confirmation" },
          { label: "Payment", value: "Confirmed by Stripe" },
        ]
      : [
          { label: "Order reference", value: orderId ?? "" },
          { label: "Seller", value: product.seller },
          { label: "Product", value: product.title },
          { label: "Quantity", value: quantityLabel },
          { label: "Unit price", value: `${money(product.unitPrice)}${product.unit}` },
          { label: "Item subtotal", value: money(itemSubtotal) },
          { label: "Shipping method", value: "Delivery" },
          { label: "Delivery cost", value: "Arranged separately" },
          { label: "Status", value: "Paid — awaiting delivery arrangement" },
          { label: "Payment", value: "Confirmed by Stripe" },
        ];

    const heroDescription = isPickup
      ? "Stripe confirmed your payment. The seller will confirm pickup details next."
      : "Stripe confirmed your payment for the product. The seller will arrange delivery next.";

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
              Your order is paid
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
              {items.length > 0 && (
                <Link href={`/buyer/checkout?listing=${encodeURIComponent(items[0].id)}`} className="mb-3 block text-sm font-semibold text-neutral-900 underline">
                  Continue with {items.length} remaining cart item{items.length === 1 ? "" : "s"}
                </Link>
              )}
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
              <CartCheckoutOverview items={items} currentId={cartItem?.id} />
              {pending && (
                <div role="status" className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900" style={{ border: "1px solid #FDE68A" }}>
                  <p className="font-semibold">Order EG-{pending.orderId} for this item is saved and awaiting payment.</p>
                  <p className="mt-1">
                    Continuing reopens payment for that same order with its saved details; no second order is
                    created. To change them, cancel the unpaid order from My Orders first.
                  </p>
                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    <div><dt className="inline text-amber-800">Quantity: </dt><dd className="inline font-semibold">{formatQuantityWithUnitName(pending.request.quantity, cartItem?.quantityUnit) ?? pending.request.quantity}</dd></div>
                    <div><dt className="inline text-amber-800">Fulfilment: </dt><dd className="inline font-semibold">{pending.request.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}</dd></div>
                    {pending.request.deliveryAddress && (
                      <div className="sm:col-span-2"><dt className="inline text-amber-800">Delivery address: </dt><dd className="inline font-semibold">{pending.request.deliveryAddress}</dd></div>
                    )}
                    {pending.request.pickupRequestedAt && (
                      <div className="sm:col-span-2"><dt className="inline text-amber-800">Requested pickup: </dt><dd className="inline font-semibold">{new Date(pending.request.pickupRequestedAt).toLocaleString("en-US")}</dd></div>
                    )}
                  </dl>
                </div>
              )}
              {/* Product */}
              <SectionCard icon={Package} label="Product">
                <div className="flex items-center gap-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <p className="text-base font-bold text-neutral-900">{product.title}</p>
                    <p className="text-sm text-neutral-500">
                      {quantityLabel} × {money(product.unitPrice)}{product.unit} · {product.seller}
                    </p>
                    <p className="text-xs text-neutral-500">
                      MOQ {formatQuantityWithUnitName(product.moq, product.quantityUnit)}{product.available !== null ? ` · ${formatQuantityWithUnitName(product.available, product.quantityUnit)} available` : ""} · {product.currencyCode}
                    </p>
                  </div>
                </div>
              </SectionCard>

              {!pending && step === "shipping" && (
                <div
                  className="overflow-hidden rounded-2xl bg-white"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex items-center gap-3 bg-neutral-50 px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-700">
                    <Truck className="size-4 text-neutral-500" />
                    Shipping
                  </div>
                  <div className={`px-5 pt-5 ${shippingType ? "" : "pb-5"}`}>
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
                    <PickupForm data={pickup} onChange={setPickup} location={pickupAddress} />
                  )}
                  {shippingType === "delivery" && (
                    <DeliveryForm
                      address={deliveryAddress}
                      onChangeAddress={() => setShowDeliveryPicker(true)}
                      onAddAddress={() => setShowDeliveryPicker(true)}
                    />
                  )}
                </div>
              )}

              {!pending && step === "payment" && (
                <SectionCard icon={DollarSign} label="Payment">
                  <div
                    className="flex gap-4 rounded-xl px-4 py-3"
                    style={{ border: "1px solid #F0F0F0" }}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                      <Shield className="size-4 text-neutral-700" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                      <p className="font-bold text-neutral-900">
                        Secure payment through Stripe
                      </p>
                      <p className="text-neutral-500">
                        Confirming reserves your order and opens Stripe Checkout to pay for the material by card.
                        EcoGlobe records the payment only after Stripe confirms it. If online
                        payment is unavailable, nothing is charged and your cart is kept.
                      </p>
                    </div>
                  </div>
                </SectionCard>
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
                <span className="font-medium text-neutral-900">{money(itemSubtotal)}</span>
              </div>
              {shippingType !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">Shipping</span>
                  <span className="font-medium text-neutral-900">
                    {shippingType === "delivery" ? "Arranged separately" : "None (pickup)"}
                  </span>
                </div>
              )}
            </div>

            {sampleCredit > 0 && <p className="mt-3 text-sm text-emerald-800">Estimated sample shipping credit: −{money(sampleCredit)} (final credit confirmed at checkout)</p>}
            <div className="my-4 flex items-center justify-between text-base font-bold">
              <span className="text-neutral-900">Material charge</span>
              <span className="text-neutral-900">{money(subtotal)}</span>
            </div>
            <p className="-mt-2 mb-4 text-xs text-neutral-500">
              Charged online for the material only. Freight and any fees are not included and are
              arranged separately.
            </p>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={
                placing ||
                (!pending && step === "shipping" && !canContinueShipping) ||
                (step === "payment" && !canConfirmOrder)
              }
              style={
                placing
                  ? { opacity: 0.6, cursor: "wait" }
                  : (!pending && step === "shipping" && !canContinueShipping) ||
                      (step === "payment" && !canConfirmOrder)
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : undefined
              }
              onClick={handlePrimary}
            >
              {placing ? "Opening secure payment…" : primaryButtonLabel}
            </Button>
          </div>

          {placeError && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {placeError}
            </p>
          )}

          {shippingType === "delivery" && step === "shipping" && (
            <div
              className="mt-4 flex gap-3 rounded-2xl bg-white p-5"
              style={{ border: "1px solid #F0F0F0" }}
            >
              <Info className="mt-0.5 size-5 shrink-0 text-neutral-700" />
              <div className="flex flex-col gap-3 text-sm">
                <p className="font-bold text-neutral-900">
                  Delivery cost is not included
                </p>
                <p className="text-neutral-500">
                  Checkout covers the product price. EcoGlobe staff coordinate delivery and its
                  cost with you and the seller after payment.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

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
              setDeliveryAddressId(id);
            }
            setShowAddBilling(false);
            setEditingBillingId(null);
          }}
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
    </div>
  );
}
