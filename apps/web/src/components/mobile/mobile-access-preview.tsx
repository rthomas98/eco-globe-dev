"use client";

import { useState } from "react";
import {
  BatteryMedium,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSignature,
  Heart,
  Leaf,
  MapPin,
  PackageSearch,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Truck,
  Wifi,
} from "lucide-react";

type MobileScreen = "browse" | "track" | "sign" | "alerts";

export interface MobileAccessPreviewProps {
  role: "buyer" | "seller" | "admin" | "public";
}

interface FlowDefinition {
  id: MobileScreen;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}

const flows: FlowDefinition[] = [
  {
    id: "browse",
    label: "Marketplace",
    detail: "Search verified materials, save listings, and start a quote.",
    icon: PackageSearch,
  },
  {
    id: "track",
    label: "Tracking",
    detail: "Follow the active route and confirm a received delivery.",
    icon: Truck,
  },
  {
    id: "sign",
    label: "Signatures",
    detail: "Review key terms and complete a mobile signature.",
    icon: FileSignature,
  },
  {
    id: "alerts",
    label: "Alerts",
    detail: "Review delivery, payment, and compliance notifications.",
    icon: Bell,
  },
];

const products = [
  {
    id: "MAT-2108",
    name: "Black Gypsum",
    location: "Port Allen, LA",
    price: "$38 / ton",
    distance: "12 mi",
    carbon: "Low CO2",
  },
  {
    id: "MAT-2041",
    name: "Scrap Polymer Blend",
    location: "Plaquemine, LA",
    price: "$22 / ton",
    distance: "18 mi",
    carbon: "Verified",
  },
  {
    id: "MAT-1987",
    name: "Pyrolysis Pitch",
    location: "Houston, TX",
    price: "$91 / ton",
    distance: "271 mi",
    carbon: "CO2 optimized",
  },
];

const alertItems = [
  {
    id: "delivery",
    title: "Shipment arriving today",
    detail: "SHP-6208 is expected at 3:30 PM.",
    time: "8 min",
    tone: "bg-blue-50 text-blue-700",
  },
  {
    id: "signature",
    title: "Signature requested",
    detail: "GreenLine lane agreement is ready.",
    time: "1 hr",
    tone: "bg-violet-50 text-violet-700",
  },
  {
    id: "payment",
    title: "Escrow funded",
    detail: "$18,420 is secured for EG-50021.",
    time: "3 hr",
    tone: "bg-emerald-50 text-emerald-700",
  },
];

export function MobileAccessPreview({ role }: MobileAccessPreviewProps) {
  const [screen, setScreen] = useState<MobileScreen>("browse");
  const [query, setQuery] = useState("");
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(
    () => new Set(),
  );

  const resetPreview = () => {
    setScreen("browse");
    setQuery("");
    setSavedProductIds(new Set());
    setQuoteRequested(false);
    setDeliveryConfirmed(false);
    setTermsAccepted(false);
    setContractSigned(false);
    setReadAlertIds(new Set());
  };

  const toggleSaved = (id: string) => {
    setSavedProductIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAlertRead = (id: string) => {
    setReadAlertIds((current) => new Set(current).add(id));
  };

  const markAllRead = () => {
    setReadAlertIds(new Set(alertItems.map((item) => item.id)));
  };

  const unreadCount = alertItems.length - readAlertIds.size;
  const activeFlow = flows.find((flow) => flow.id === screen) ?? flows[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="border-b border-white/10 bg-gradient-to-br from-emerald-500/20 via-transparent to-blue-500/10 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Interactive prototype
              </p>
              <h2 className="mt-2 text-2xl font-bold">Choose a mobile flow</h2>
            </div>
            <button
              type="button"
              onClick={resetPreview}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/10"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
          <p className="mt-3 max-w-lg text-sm leading-6 text-neutral-300">
            A polished responsive-web concept for validating the highest-value
            mobile workflows before expanding the native app.
          </p>
        </div>

        <div className="p-4 pb-0">
          <label
            htmlFor="mobile-preview-flow"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-400"
          >
            Quick preview
          </label>
          <select
            id="mobile-preview-flow"
            value={screen}
            onChange={(event) => setScreen(event.target.value as MobileScreen)}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none"
          >
            {flows.map((flow) => (
              <option
                key={flow.id}
                value={flow.id}
                className="text-neutral-950"
              >
                {flow.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden space-y-3 p-4 md:block">
          {flows.map((flow) => {
            const Icon = flow.icon;
            const active = flow.id === screen;
            return (
              <button
                type="button"
                key={flow.id}
                onClick={() => setScreen(flow.id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left transition ${
                  active
                    ? "bg-white text-neutral-950 shadow-lg"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white/10 text-emerald-300"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{flow.label}</span>
                  <span
                    className={`mt-1 block text-sm ${
                      active ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    {flow.detail}
                  </span>
                </span>
                <ChevronRight
                  className={`size-4 shrink-0 ${
                    active ? "text-neutral-400" : "text-neutral-600"
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-px border-t border-white/10 bg-white/10">
          <ReadinessMetric value="4" label="Core flows" />
          <ReadinessMetric value="AA" label="A11y target" />
          <ReadinessMetric value="PWA" label="Delivery path" />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100 via-slate-100 to-blue-100 p-4 shadow-sm ring-1 ring-neutral-200 sm:p-8">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 size-64 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-[390px]">
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm shadow-sm backdrop-blur">
            <div>
              <p className="font-bold text-neutral-950">
                {activeFlow.label} preview
              </p>
              <p className="text-xs capitalize text-neutral-500">
                {role} experience
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Radio className="size-3" aria-hidden="true" />
              Interactive
            </span>
          </div>

          <PhoneFrame
            screen={screen}
            onScreenChange={setScreen}
            unreadCount={unreadCount}
          >
            {screen === "browse" && (
              <BrowseScreen
                query={query}
                onQueryChange={setQuery}
                savedProductIds={savedProductIds}
                onToggleSaved={toggleSaved}
                quoteRequested={quoteRequested}
                onRequestQuote={() => setQuoteRequested(true)}
              />
            )}
            {screen === "track" && (
              <TrackingScreen
                confirmed={deliveryConfirmed}
                onConfirm={() => setDeliveryConfirmed(true)}
              />
            )}
            {screen === "sign" && (
              <SignatureScreen
                accepted={termsAccepted}
                onAcceptedChange={setTermsAccepted}
                signed={contractSigned}
                onSign={() => setContractSigned(true)}
              />
            )}
            {screen === "alerts" && (
              <AlertsScreen
                readAlertIds={readAlertIds}
                onRead={markAlertRead}
                onMarkAllRead={markAllRead}
              />
            )}
          </PhoneFrame>
        </div>
      </section>
    </div>
  );
}

function PhoneFrame({
  screen,
  onScreenChange,
  unreadCount,
  children,
}: {
  screen: MobileScreen;
  onScreenChange: (screen: MobileScreen) => void;
  unreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-[2.8rem] bg-neutral-950 p-2.5 shadow-[0_28px_80px_rgba(15,23,42,0.35)]">
      <div className="overflow-hidden rounded-[2.25rem] bg-neutral-50">
        <div className="relative flex items-center justify-between bg-white px-6 pb-2 pt-3 text-[10px] font-bold text-neutral-800">
          <span>9:41</span>
          <span className="absolute left-1/2 h-5 w-24 -translate-x-1/2 rounded-full bg-neutral-950" />
          <span className="flex items-center gap-1.5">
            <Wifi className="size-3" aria-hidden="true" />
            <BatteryMedium className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-neutral-950 font-black text-white">
              E
            </span>
            <div>
              <p className="text-sm font-black tracking-tight text-neutral-950">
                EcoGlobe
              </p>
              <p className="text-[10px] text-neutral-400">
                Circular marketplace
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Open alerts"
            onClick={() => onScreenChange("alerts")}
            className="relative flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700"
          >
            <Bell className="size-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="h-[570px] overflow-y-auto">{children}</div>

        <nav
          aria-label="Mobile preview navigation"
          className="grid grid-cols-4 border-t border-neutral-200 bg-white px-2 pb-3 pt-2"
        >
          <PhoneNavButton
            active={screen === "browse"}
            label="Browse"
            icon={Search}
            onClick={() => onScreenChange("browse")}
          />
          <PhoneNavButton
            active={screen === "track"}
            label="Track"
            icon={Truck}
            onClick={() => onScreenChange("track")}
          />
          <PhoneNavButton
            active={screen === "sign"}
            label="Sign"
            icon={FileSignature}
            onClick={() => onScreenChange("sign")}
          />
          <PhoneNavButton
            active={screen === "alerts"}
            label="Alerts"
            icon={Bell}
            badge={unreadCount}
            onClick={() => onScreenChange("alerts")}
          />
        </nav>
      </div>
    </div>
  );
}

function BrowseScreen({
  query,
  onQueryChange,
  savedProductIds,
  onToggleSaved,
  quoteRequested,
  onRequestQuote,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  savedProductIds: Set<string>;
  onToggleSaved: (id: string) => void;
  quoteRequested: boolean;
  onRequestQuote: () => void;
}) {
  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.location}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="p-4">
      <div className="rounded-2xl bg-neutral-950 p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
          Marketplace
        </p>
        <h3 className="mt-2 text-2xl font-black">Find verified feedstocks</h3>
        <p className="mt-2 text-xs leading-5 text-neutral-300">
          Compare price, proximity, and carbon impact from one mobile search.
        </p>
      </div>

      <div className="relative mt-4">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <input
          aria-label="Search mobile marketplace"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Material or location"
          className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-11 text-sm outline-none focus:border-neutral-400"
        />
        <SlidersHorizontal
          className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500"
          aria-hidden="true"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-neutral-950">
          {visibleProducts.length} nearby materials
        </p>
        <span className="text-xs font-semibold text-emerald-700">
          Verified only
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {visibleProducts.map((product) => {
          const saved = savedProductIds.has(product.id);
          return (
            <article
              key={product.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-neutral-950">{product.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                    <MapPin className="size-3" aria-hidden="true" />
                    {product.location} · {product.distance}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`${saved ? "Remove" : "Save"} ${product.name}`}
                  aria-pressed={saved}
                  onClick={() => onToggleSaved(product.id)}
                  className={`flex size-8 items-center justify-center rounded-full ${
                    saved
                      ? "bg-red-50 text-red-600"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  <Heart
                    className={`size-4 ${saved ? "fill-current" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-neutral-950">
                    {product.price}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <Leaf className="size-3" aria-hidden="true" />
                    {product.carbon}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestQuote}
                  disabled={quoteRequested}
                  className="rounded-full bg-neutral-950 px-3 py-2 text-xs font-bold text-white disabled:bg-emerald-600"
                >
                  {quoteRequested ? "Quote requested" : "Request quote"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {quoteRequested && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
        >
          Quote request created and added to My Orders.
        </p>
      )}
    </div>
  );
}

function TrackingScreen({
  confirmed,
  onConfirm,
}: {
  confirmed: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-neutral-500">SHP-6208</p>
          <h3 className="mt-1 text-xl font-black text-neutral-950">
            Black Gypsum
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            confirmed
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {confirmed ? "Delivered" : "At facility"}
        </span>
      </div>

      <div className="relative mt-4 h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100 via-emerald-50 to-slate-100">
        <div className="absolute left-6 top-10 size-4 rounded-full border-4 border-white bg-neutral-950 shadow" />
        <div className="absolute bottom-10 right-8 size-5 rounded-full border-4 border-white bg-emerald-600 shadow" />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M 12 28 C 38 72, 62 24, 88 72"
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeDasharray="5 4"
          />
        </svg>
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-neutral-700">
          Houston → Baton Rouge
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <PhoneMetric label="ETA" value={confirmed ? "Complete" : "3:30 PM"} />
        <PhoneMetric label="Carrier" value="GreenLine" />
        <PhoneMetric label="CO2" value="360 kg" />
      </div>

      <div className="mt-4 space-y-3">
        {[
          ["Pickup confirmed", true],
          ["Scale ticket uploaded", true],
          ["Arrived at facility", true],
          ["Buyer confirmation", confirmed],
        ].map(([label, complete]) => (
          <div key={String(label)} className="flex items-center gap-3">
            <span
              className={`flex size-7 items-center justify-center rounded-full ${
                complete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {complete ? (
                <Check className="size-4" />
              ) : (
                <Clock3 className="size-4" />
              )}
            </span>
            <span className="text-sm font-semibold text-neutral-700">
              {label}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmed}
        className="mt-5 w-full rounded-full bg-neutral-950 px-4 py-3 text-sm font-bold text-white disabled:bg-emerald-600"
      >
        {confirmed ? "Delivery confirmed" : "Confirm delivery"}
      </button>
      {confirmed && (
        <p
          role="status"
          className="mt-3 text-center text-xs font-semibold text-emerald-700"
        >
          Escrow inspection window is now active.
        </p>
      )}
    </div>
  );
}

function SignatureScreen({
  accepted,
  onAcceptedChange,
  signed,
  onSign,
}: {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  signed: boolean;
  onSign: () => void;
}) {
  return (
    <div className="p-4">
      <div className="rounded-2xl bg-violet-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <FileSignature className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-violet-600">
              Signature request
            </p>
            <h3 className="font-black text-neutral-950">
              GreenLine Lane Agreement
            </h3>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500">
            CON-4412
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
            Signature needed
          </span>
        </div>
        <h3 className="mt-3 text-lg font-black text-neutral-950">
          Regional transport services
        </h3>
        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Covers verified Gulf Coast shipments, proof-of-delivery requirements,
          and a 48-hour exception window.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <PhoneMetric label="Term" value="12 months" />
          <PhoneMetric label="Value" value="$86,400" />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
          disabled={signed}
          className="mt-0.5 size-4"
        />
        <span className="text-xs leading-5 text-neutral-600">
          I reviewed the agreement and consent to use my electronic signature.
        </span>
      </label>

      <button
        type="button"
        onClick={onSign}
        disabled={!accepted || signed}
        className="mt-4 w-full rounded-full bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:bg-neutral-300"
      >
        {signed ? "Agreement signed" : "Sign agreement"}
      </button>
      {signed && (
        <div
          role="status"
          className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          <p className="text-xs font-semibold">
            Signature recorded. A completed copy is available in Documents.
          </p>
        </div>
      )}
    </div>
  );
}

function AlertsScreen({
  readAlertIds,
  onRead,
  onMarkAllRead,
}: {
  readAlertIds: Set<string>;
  onRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const unreadCount = alertItems.length - readAlertIds.size;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-neutral-950">Notifications</h3>
          <p className="mt-1 text-xs text-neutral-500">
            {unreadCount} unread across your activity
          </p>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
          className="text-xs font-bold text-emerald-700 disabled:text-neutral-400"
        >
          Mark all read
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {alertItems.map((item) => {
          const read = readAlertIds.has(item.id);
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onRead(item.id)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                read
                  ? "border-neutral-100 bg-neutral-50 opacity-65"
                  : "border-neutral-200 bg-white shadow-sm"
              }`}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
              >
                <Bell className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-neutral-950">
                    {item.title}
                  </span>
                  {!read && (
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </span>
                <span className="mt-1 block text-xs leading-5 text-neutral-500">
                  {item.detail}
                </span>
                <span className="mt-2 block text-[10px] font-semibold text-neutral-400">
                  {item.time} ago
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {unreadCount === 0 && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center text-xs font-semibold text-emerald-800"
        >
          You are all caught up.
        </p>
      )}
    </div>
  );
}

function PhoneNavButton({
  active,
  label,
  icon: Icon,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold ${
        active ? "bg-neutral-950 text-white" : "text-neutral-400"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
      {!!badge && (
        <span className="absolute right-3 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function PhoneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-100">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-black text-neutral-950">{value}</p>
    </div>
  );
}

function ReadinessMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-slate-950 px-3 py-4 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
    </div>
  );
}
