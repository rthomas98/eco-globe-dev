"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Leaf,
  PackageCheck,
  Route,
  Truck,
  X,
} from "lucide-react";
import { Button, Select } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import {
  carrierQuotes,
  logisticsShipments,
  type LogisticsShipment,
} from "../logistics/logistics-demo-data";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">{label}</span>
        <Icon className="size-5 text-neutral-400" />
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: LogisticsShipment["status"] }) {
  const tone =
    status === "Exception"
      ? "bg-red-50 text-red-700"
      : status === "Delivered"
        ? "bg-green-50 text-green-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}
    >
      {status}
    </span>
  );
}

interface QuoteRequest {
  origin: string;
  destination: string;
  quantity: string;
  optimization: "co2" | "cost" | "speed";
}

const locationLabels: Record<string, string> = {
  cadiz: "Cadiz, Spain",
  houston: "Houston, TX",
  atlanta: "Atlanta, GA",
  "baton-rouge": "Baton Rouge, LA",
};

const quantityLabels: Record<string, string> = {
  "20": "20 tons",
  "200": "200 tons",
  "1000": "1,000 tons",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatQuoteCost(value: number) {
  return currencyFormatter.format(value);
}

export function BuyerLogisticsPage() {
  const [selected, setSelected] = useState(logisticsShipments[0]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [inspectionComplete, setInspectionComplete] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [confirmationDetails, setConfirmationDetails] = useState<
    Record<string, { receiverName: string; notes: string }>
  >({});
  const [quoteForm, setQuoteForm] = useState<QuoteRequest>({
    origin: "cadiz",
    destination: "atlanta",
    quantity: "200",
    optimization: "co2",
  });
  const [calculatedRequest, setCalculatedRequest] = useState(quoteForm);
  const [quoteMessage, setQuoteMessage] = useState(
    "Showing the lowest-carbon carrier options for the current shipment.",
  );
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [bookedQuote, setBookedQuote] = useState<{
    carrier: string;
    cost: string;
    pickupDate: string;
    reference: string;
  } | null>(null);
  const calculatorRef = useRef<HTMLElement>(null);

  const effectiveStatus = confirmed[selected.id]
    ? "Delivered"
    : selected.status;
  const activeShipmentCount =
    logisticsShipments.filter(
      (shipment) => shipment.status !== "Delivered" && !confirmed[shipment.id],
    ).length + (bookedQuote ? 1 : 0);
  const awaitingConfirmationCount = logisticsShipments.filter(
    (shipment) => shipment.status === "Delivered" && !confirmed[shipment.id],
  ).length;

  const activeQuotes = useMemo(() => {
    const quantityMultiplier =
      calculatedRequest.quantity === "1000"
        ? 3.8
        : calculatedRequest.quantity === "200"
          ? 1.7
          : 1;
    const routeMultiplier =
      calculatedRequest.origin === "houston" &&
      calculatedRequest.destination === "baton-rouge"
        ? 0.55
        : 1;

    const quotes = carrierQuotes.map((quote) => {
      const baseCost = Number(quote.cost.replace(/[$,]/g, ""));
      return {
        ...quote,
        calculatedCost: formatQuoteCost(
          Math.round(baseCost * quantityMultiplier * routeMultiplier),
        ),
      };
    });

    return quotes.sort((a, b) => {
      if (calculatedRequest.optimization === "cost") {
        return (
          Number(a.calculatedCost.replace(/[$,]/g, "")) -
          Number(b.calculatedCost.replace(/[$,]/g, ""))
        );
      }
      if (calculatedRequest.optimization === "speed") {
        const speedRank: Record<string, number> = {
          "24 hrs": 1,
          "2 days": 2,
          "3 days": 3,
        };
        return speedRank[a.eta] - speedRank[b.eta];
      }
      return a.carbonKg - b.carbonKg;
    });
  }, [calculatedRequest]);
  const selectedQuote =
    activeQuotes.find((quote) => quote.carrier === selectedCarrier) ?? null;

  const openCalculator = () => {
    calculatorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.requestAnimationFrame(() => {
      document.getElementById("origin")?.focus();
    });
  };

  const calculateShipping = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCalculatedRequest(quoteForm);
    setSelectedCarrier(null);
    setBookedQuote(null);
    setQuoteMessage(
      `3 carrier quotes refreshed for ${quantityLabels[quoteForm.quantity]} from ${locationLabels[quoteForm.origin]} to ${locationLabels[quoteForm.destination]}.`,
    );
  };

  const openBooking = () => {
    setPickupDate("");
    setBookingReference("");
    setBookingOpen(true);
  };

  const confirmBooking = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedQuote || !pickupDate) return;
    setBookedQuote({
      carrier: selectedQuote.carrier,
      cost: selectedQuote.calculatedCost,
      pickupDate,
      reference: bookingReference.trim(),
    });
    setBookingOpen(false);
  };

  const openDeliveryConfirmation = () => {
    const existing = confirmationDetails[selected.id];
    setReceiverName(existing?.receiverName ?? "");
    setDeliveryNotes(existing?.notes ?? "");
    setInspectionComplete(false);
    setConfirmationOpen(true);
  };

  const confirmDelivery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!receiverName.trim() || !inspectionComplete) return;
    setConfirmed((current) => ({ ...current, [selected.id]: true }));
    setConfirmationDetails((current) => ({
      ...current,
      [selected.id]: {
        receiverName: receiverName.trim(),
        notes: deliveryNotes.trim(),
      },
    }));
    setConfirmationOpen(false);
  };

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              Logistics & Shipping
            </p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">
              Track shipments, compare carriers, and confirm delivery.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Buyer view for real-time shipping costs, carbon-optimized carrier
              options, tracking updates, and delivery confirmation tied to
              escrow release.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={openCalculator}
          >
            Calculate shipping
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard
            label="Active shipments"
            value={String(activeShipmentCount)}
            icon={Truck}
          />
          <StatCard
            label="Awaiting confirmation"
            value={String(awaitingConfirmationCount)}
            icon={PackageCheck}
          />
          <StatCard label="Avg quote time" value="42 sec" icon={Clock3} />
          <StatCard label="CO2 avoided" value="14.8 t" icon={Leaf} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">
                  Shipment tracking
                </h2>
                <p className="text-sm text-neutral-500">
                  Live carrier status, ETA, and delivery confirmation.
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                Tracking integrated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr
                    className="text-left text-sm text-neutral-500"
                    style={{ borderBottom: "1px solid #F0F0F0" }}
                  >
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Carrier</th>
                    <th className="pb-3 font-medium">ETA</th>
                    <th className="pb-3 font-medium">Carbon</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logisticsShipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      onClick={() => setSelected(shipment)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected(shipment);
                        }
                      }}
                      tabIndex={0}
                      aria-selected={selected.id === shipment.id}
                      className={`cursor-pointer text-sm hover:bg-neutral-50 ${
                        selected.id === shipment.id ? "bg-neutral-50" : ""
                      }`}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                    >
                      <td className="py-4 font-semibold text-neutral-900">
                        {shipment.orderId}
                      </td>
                      <td className="py-4 text-neutral-700">
                        {shipment.product}
                      </td>
                      <td className="py-4 text-neutral-700">
                        {shipment.carrier}
                      </td>
                      <td className="py-4 text-neutral-700">{shipment.eta}</td>
                      <td className="py-4 text-neutral-700">
                        {shipment.carbonKg} kg CO2e
                      </td>
                      <td className="py-4">
                        <StatusPill
                          status={
                            confirmed[shipment.id]
                              ? "Delivered"
                              : shipment.status
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900">
                Shipment detail
              </h2>
              <StatusPill status={effectiveStatus} />
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Tracking ID
                </p>
                <p className="mt-1 font-mono text-neutral-900">
                  {selected.trackingId}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Origin
                  </p>
                  <p className="mt-1 text-neutral-900">{selected.origin}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Destination
                  </p>
                  <p className="mt-1 text-neutral-900">
                    {selected.destination}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="mb-3 text-sm font-semibold text-neutral-900">
                  Route
                </p>
                <div className="space-y-3">
                  {selected.route.map((stop, index) => (
                    <div key={stop} className="flex items-center gap-3">
                      <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-700">
                        {index + 1}
                      </span>
                      <span className="text-sm text-neutral-700">{stop}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-green-50 p-4 text-green-800">
                <p className="font-semibold">Carbon optimized route</p>
                <p className="mt-1 text-sm">
                  Saves {selected.optimizedCarbonKg - selected.carbonKg} kg CO2e
                  versus the default route.
                </p>
              </div>
              <p className="text-neutral-600">
                {confirmed[selected.id]
                  ? `Delivery confirmed by ${confirmationDetails[selected.id]?.receiverName ?? "buyer"}`
                  : selected.lastUpdate}
              </p>
              <p className="font-medium text-neutral-900">
                {confirmed[selected.id]
                  ? "Inspection complete. Escrow release is ready."
                  : selected.nextStep}
              </p>
              {confirmed[selected.id] && (
                <p
                  role="status"
                  className="rounded-xl bg-emerald-50 px-4 py-3 font-medium text-emerald-800"
                >
                  Delivery confirmation recorded for {selected.orderId}.
                </p>
              )}
              <Button
                type="button"
                variant={confirmed[selected.id] ? "secondary" : "primary"}
                size="md"
                disabled={confirmed[selected.id]}
                onClick={openDeliveryConfirmation}
                className="w-full"
              >
                {confirmed[selected.id]
                  ? "Delivery confirmed"
                  : "Confirm delivery"}
              </Button>
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section
            ref={calculatorRef}
            className="scroll-mt-6 rounded-2xl bg-white p-5"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <h2 className="text-xl font-bold text-neutral-900">
              Shipping cost calculator
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Compare estimated carrier rates before checkout.
            </p>
            <form onSubmit={calculateShipping}>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Select
                  id="origin"
                  label="Origin"
                  value={quoteForm.origin}
                  onChange={(event) =>
                    setQuoteForm((current) => ({
                      ...current,
                      origin: event.target.value,
                    }))
                  }
                  options={[
                    { value: "cadiz", label: "Cadiz, Spain" },
                    { value: "houston", label: "Houston, TX" },
                  ]}
                />
                <Select
                  id="destination"
                  label="Destination"
                  value={quoteForm.destination}
                  onChange={(event) =>
                    setQuoteForm((current) => ({
                      ...current,
                      destination: event.target.value,
                    }))
                  }
                  options={[
                    { value: "atlanta", label: "Atlanta, GA" },
                    { value: "baton-rouge", label: "Baton Rouge, LA" },
                  ]}
                />
                <Select
                  id="quantity"
                  label="Quantity"
                  value={quoteForm.quantity}
                  onChange={(event) =>
                    setQuoteForm((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                  options={[
                    { value: "20", label: "20 tons" },
                    { value: "200", label: "200 tons" },
                    { value: "1000", label: "1,000 tons" },
                  ]}
                />
                <Select
                  id="optimization"
                  label="Optimize for"
                  value={quoteForm.optimization}
                  onChange={(event) =>
                    setQuoteForm((current) => ({
                      ...current,
                      optimization: event.target
                        .value as QuoteRequest["optimization"],
                    }))
                  }
                  options={[
                    { value: "co2", label: "Lowest CO2" },
                    { value: "cost", label: "Lowest cost" },
                    { value: "speed", label: "Fastest ETA" },
                  ]}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="mt-4 w-full"
              >
                Compare carrier quotes
              </Button>
            </form>
            <p
              role="status"
              className="mt-3 text-sm font-medium text-green-700"
            >
              {quoteMessage}
            </p>
          </section>

          <section
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <h2 className="text-xl font-bold text-neutral-900">
              Carrier quotes
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {activeQuotes.map((quote, index) => (
                <div
                  key={quote.carrier}
                  className={`rounded-xl p-4 ring-1 transition ${
                    selectedCarrier === quote.carrier
                      ? "bg-emerald-50 ring-emerald-500"
                      : "bg-neutral-50 ring-transparent"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {quote.carrier}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {quote.service}
                      </p>
                    </div>
                    <Route className="size-5 text-neutral-400" />
                  </div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {quote.calculatedCost}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-neutral-600">
                    <p>ETA: {quote.eta}</p>
                    <p>Carbon: {quote.carbonKg} kg CO2e</p>
                    <p>On-time: {quote.onTimeRate}</p>
                    <p className="font-semibold text-green-700">
                      {quote.sustainableOption}
                    </p>
                    {index === 0 && (
                      <p className="font-semibold text-neutral-900">
                        Recommended for this request
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-pressed={selectedCarrier === quote.carrier}
                    onClick={() => {
                      setSelectedCarrier(quote.carrier);
                      setBookedQuote(null);
                    }}
                    className={`mt-4 w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedCarrier === quote.carrier
                        ? "bg-emerald-700 text-white"
                        : "border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
                    }`}
                  >
                    {selectedCarrier === quote.carrier
                      ? "Selected"
                      : `Select ${quote.carrier}`}
                  </button>
                </div>
              ))}
            </div>

            {selectedQuote && (
              <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-neutral-950">
                      {selectedQuote.carrier} selected
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {selectedQuote.calculatedCost} / {selectedQuote.eta} /{" "}
                      {quantityLabels[calculatedRequest.quantity]}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={openBooking}
                    disabled={bookedQuote?.carrier === selectedQuote.carrier}
                  >
                    {bookedQuote?.carrier === selectedQuote.carrier
                      ? "Quote booked"
                      : "Book selected quote"}
                  </Button>
                </div>
              </div>
            )}

            {bookedQuote && (
              <p
                role="status"
                className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              >
                {bookedQuote.carrier} booked for {bookedQuote.pickupDate} at{" "}
                {bookedQuote.cost}
                {bookedQuote.reference
                  ? ` with reference ${bookedQuote.reference}`
                  : ""}
                .
              </p>
            )}
          </section>
        </div>

        {bookingOpen && selectedQuote && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close carrier booking"
              onClick={() => setBookingOpen(false)}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[1px]"
            />
            <dialog
              open
              aria-modal="true"
              aria-labelledby="carrier-booking-title"
              className="relative z-10 m-0 w-full max-w-lg rounded-3xl bg-white p-0 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
                    Carrier booking
                  </p>
                  <h2
                    id="carrier-booking-title"
                    className="mt-1 text-2xl font-bold text-neutral-950"
                  >
                    Book {selectedQuote.carrier}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close carrier booking"
                  onClick={() => setBookingOpen(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={confirmBooking} className="space-y-5 px-6 py-6">
                <div className="rounded-2xl bg-neutral-50 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-neutral-600">
                      Route
                    </span>
                    <span className="text-right font-bold text-neutral-950">
                      {locationLabels[calculatedRequest.origin]} to{" "}
                      {locationLabels[calculatedRequest.destination]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="font-semibold text-neutral-600">Load</span>
                    <span className="font-bold text-neutral-950">
                      {quantityLabels[calculatedRequest.quantity]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="font-semibold text-neutral-600">Rate</span>
                    <span className="font-bold text-neutral-950">
                      {selectedQuote.calculatedCost}
                    </span>
                  </div>
                </div>

                <div>
                  <Select
                    id="pickup-date"
                    label="Requested pickup date"
                    value={pickupDate}
                    onChange={(event) => setPickupDate(event.target.value)}
                    autoFocus
                    required
                    options={[
                      { value: "2026-07-20", label: "July 20, 2026" },
                      { value: "2026-07-22", label: "July 22, 2026" },
                      { value: "2026-07-24", label: "July 24, 2026" },
                    ]}
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-reference"
                    className="mb-2 block text-sm font-semibold text-neutral-800"
                  >
                    Internal reference{" "}
                    <span className="font-normal text-neutral-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="booking-reference"
                    value={bookingReference}
                    onChange={(event) =>
                      setBookingReference(event.target.value)
                    }
                    placeholder="Purchase order or project reference"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!pickupDate}
                  >
                    Confirm booking
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setBookingOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </dialog>
          </div>
        )}

        {confirmationOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close delivery confirmation"
              onClick={() => setConfirmationOpen(false)}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[1px]"
            />
            <dialog
              open
              aria-modal="true"
              aria-labelledby="delivery-confirmation-title"
              aria-describedby="delivery-confirmation-description"
              className="relative z-10 m-0 w-full max-w-lg rounded-3xl bg-white p-0 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
                    Delivery confirmation
                  </p>
                  <h2
                    id="delivery-confirmation-title"
                    className="mt-1 text-2xl font-bold text-neutral-950"
                  >
                    Confirm {selected.orderId}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close delivery confirmation"
                  onClick={() => setConfirmationOpen(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={confirmDelivery} className="space-y-5 px-6 py-6">
                <div
                  id="delivery-confirmation-description"
                  className="rounded-2xl bg-neutral-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-neutral-950">
                        {selected.product}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {selected.carrier} / {selected.trackingId}
                      </p>
                    </div>
                    <StatusPill status={selected.status} />
                  </div>
                  {selected.status !== "Delivered" && (
                    <p className="mt-3 text-sm font-medium text-amber-800">
                      The carrier has not marked this shipment delivered.
                      Confirm only if it has arrived and your inspection is
                      complete.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="receiver-name"
                    className="mb-2 block text-sm font-semibold text-neutral-800"
                  >
                    Received by
                  </label>
                  <input
                    id="receiver-name"
                    value={receiverName}
                    onChange={(event) => setReceiverName(event.target.value)}
                    placeholder="Full name"
                    autoFocus
                    required
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="delivery-notes"
                    className="mb-2 block text-sm font-semibold text-neutral-800"
                  >
                    Delivery notes{" "}
                    <span className="font-normal text-neutral-400">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="delivery-notes"
                    value={deliveryNotes}
                    onChange={(event) => setDeliveryNotes(event.target.value)}
                    placeholder="Condition, quantity, or receiving notes"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4">
                  <input
                    type="checkbox"
                    checked={inspectionComplete}
                    onChange={(event) =>
                      setInspectionComplete(event.target.checked)
                    }
                    className="mt-0.5 size-4"
                  />
                  <span className="text-sm text-neutral-700">
                    I confirm the shipment was received and inspected, and the
                    load matches the order requirements.
                  </span>
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!receiverName.trim() || !inspectionComplete}
                  >
                    <CheckCircle2 className="size-4" />
                    Record confirmation
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setConfirmationOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </dialog>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
