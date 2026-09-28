"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { Button, Select } from "@eco-globe/ui";
import {
  fetchLogisticsWorkspace,
  type LogisticsOrder,
  type LogisticsShipment,
  type LogisticsWorkspace as Workspace,
} from "@/lib/api-logistics";
import { describeBackendError } from "@/lib/backend-client";
import { SavedShipmentMap } from "./saved-shipment-map";
import { LogisticsOrderActions } from "./logistics-order-actions";
import {
  formatDateTime,
  formatMoney,
  formatQuantity,
  isClosedOrder,
  isPickupOrder,
  logisticsStage,
  needsActionFrom,
  nextStepCopy,
  stageLabel,
  TONE_CLASSES,
  type LogisticsPortal,
} from "./logistics-stage";

type Filter = "action" | "active" | "closed" | "all";
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; workspace: Workspace };

const card = { border: "1px solid #F0F0F0" } as const;

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "action", label: "Needs my action" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Completed or cancelled" },
  { value: "all", label: "All orders" },
];

function isFilter(value: string): value is Filter {
  return FILTER_OPTIONS.some((option) => option.value === value);
}

function hasCoordinates(shipment: LogisticsShipment) {
  return [
    shipment.originLatitude,
    shipment.originLongitude,
    shipment.destinationLatitude,
    shipment.destinationLongitude,
  ].some((value) => value !== null);
}

/**
 * Persisted, staff-managed logistics workspace shared by the buyer, seller
 * and admin portals. Every row and action comes from `/api/logistics`; there
 * is no demo data, live carrier booking or vehicle telemetry here.
 */
/** Accepts `EG-12`, `12` or other references ending in the numeric order id. */
export function parseOrderReference(reference: string): number | null {
  const match = /^(?:EG-)?(\d+)$/i.exec(reference.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function LogisticsWorkspace({
  portal,
  scope = "orders",
  orderId,
}: {
  portal: LogisticsPortal;
  /** `shipments` limits the list to orders that already have a shipment record. */
  scope?: "orders" | "shipments";
  /** Show only this order's logistics (detail pages). Unknown ids show an unavailable state. */
  orderId?: number;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<Filter>(scope === "shipments" ? "all" : "active");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      const workspace = await fetchLogisticsWorkspace();
      setState({ status: "ready", workspace });
    } catch (error) {
      const message = describeBackendError(error, "Logistics could not be loaded.");
      // Keep the last good workspace visible when a refresh fails.
      setState((current) => (current.status === "ready" ? current : { status: "error", message }));
      setRefreshError(message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const orders = useMemo(() => {
    if (state.status !== "ready") return [];
    if (orderId !== undefined) return state.workspace.orders.filter((order) => order.id === orderId);
    return scope === "shipments"
      ? state.workspace.orders.filter((order) => order.shipment !== null)
      : state.workspace.orders;
  }, [state, scope, orderId]);

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (filter === "action") return needsActionFrom(order, portal);
        if (filter === "active") return !isClosedOrder(order) && logisticsStage(order).kind !== "delivered";
        if (filter === "closed") return isClosedOrder(order);
        return true;
      }),
    [orders, filter, portal],
  );

  const selected =
    orders.find((order) => order.id === selectedId) ?? visibleOrders[0] ?? null;

  const handleChanged = useCallback(
    async (message: string) => {
      setNotice(message);
      await load();
    },
    [load],
  );

  const metrics = useMemo(() => {
    const count = (predicate: (order: LogisticsOrder) => boolean) => orders.filter(predicate).length;
    return [
      { label: "Needs my action", value: count((o) => needsActionFrom(o, portal)), icon: ClipboardList },
      { label: "Quotes awaiting buyer", value: count((o) => logisticsStage(o).kind === "quote_offered"), icon: Truck },
      { label: "In transit", value: count((o) => logisticsStage(o).kind === "in_transit"), icon: PackageCheck },
      {
        label: "Receipts recorded",
        value: count((o) => ["delivered", "pickup_received"].includes(logisticsStage(o).kind)),
        icon: CheckCircle2,
      },
    ];
  }, [orders, portal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
          Staff-managed logistics · no live carrier booking or vehicle tracking
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void load()}
          disabled={refreshing}
          aria-label="Refresh logistics"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </p>
      )}
      {refreshError && state.status === "ready" && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Refresh failed: {refreshError} Showing the last loaded data.
        </p>
      )}

      {state.status === "loading" && (
        <p role="status" className="rounded-2xl bg-white p-6 text-sm text-neutral-600" style={card}>
          Loading logistics…
        </p>
      )}

      {state.status === "error" && (
        <div role="alert" className="rounded-2xl bg-white p-6 text-sm" style={card}>
          <p className="font-semibold text-red-700">Logistics could not be loaded.</p>
          <p className="mt-1 text-neutral-600">{state.message}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => void load()} disabled={refreshing}>
            Try again
          </Button>
        </div>
      )}

      {state.status === "ready" && orderId !== undefined && (
        orders[0] ? (
          <OrderDetail
            key={orders[0].id}
            order={orders[0]}
            portal={portal}
            carriers={state.workspace.carriers}
            onChanged={handleChanged}
          />
        ) : (
          <div role="status" className="rounded-2xl bg-white p-6 text-sm" style={card}>
            <p className="font-semibold text-neutral-900">Logistics unavailable for EG-{orderId}.</p>
            <p className="mt-1 text-neutral-600">
              This order is not in your logistics workspace. It may not exist, or your active company
              is not a participant.
            </p>
          </div>
        )
      )}

      {state.status === "ready" && orderId === undefined && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl bg-white p-5" style={card}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-neutral-500">{metric.label}</span>
                  <metric.icon className="size-5 text-neutral-400" aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold text-neutral-900">{metric.value}</p>
              </div>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center" style={card}>
              <p className="font-semibold text-neutral-900">
                {scope === "shipments" ? "No saved shipments yet." : "No orders to coordinate yet."}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {scope === "shipments"
                  ? "Shipments appear once a buyer accepts a shipping quote or a pickup receipt is recorded."
                  : "Orders appear here once they are placed. Delivery orders need a shipping quote; pickup orders only need the buyer's receipt."}
              </p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <section className="min-w-0 rounded-2xl bg-white p-4 sm:p-5" style={card} aria-labelledby="logistics-orders-heading">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 id="logistics-orders-heading" className="text-xl font-bold text-neutral-900">
                      {scope === "shipments" ? "Saved shipments" : "Orders"}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {visibleOrders.length} of {orders.length} shown
                    </p>
                  </div>
                  <div className="sm:min-w-[210px]">
                    <Select
                      id={`logistics-filter-${portal}`}
                      aria-label="Filter orders"
                      value={filter}
                      onChange={(event) => {
                        if (isFilter(event.target.value)) setFilter(event.target.value);
                      }}
                      options={FILTER_OPTIONS}
                    />
                  </div>
                </div>
                {visibleOrders.length === 0 ? (
                  <div className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-600">
                    {filter === "action" ? "Nothing needs your action right now." : "No orders match this filter."}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {visibleOrders.map((order) => (
                      <li key={order.id}>
                        <OrderRow
                          order={order}
                          portal={portal}
                          selected={selected?.id === order.id}
                          onSelect={() => {
                            setSelectedId(order.id);
                            setNotice("");
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {selected && (
                <OrderDetail
                  key={selected.id}
                  order={selected}
                  portal={portal}
                  carriers={state.workspace.carriers}
                  onChanged={(message) => {
                    // Keep the acted-on order selected even if it leaves the filter.
                    setSelectedId(selected.id);
                    return handleChanged(message);
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StagePill({ order }: { order: LogisticsOrder }) {
  const { label, tone } = stageLabel(logisticsStage(order));
  return (
    <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}

function OrderRow({
  order,
  portal,
  selected,
  onSelect,
}: {
  order: LogisticsOrder;
  portal: LogisticsPortal;
  selected: boolean;
  onSelect: () => void;
}) {
  const counterparty =
    portal === "buyer"
      ? order.sellerCompanyName
      : portal === "seller"
        ? order.buyerCompanyName
        : `${order.sellerCompanyName} → ${order.buyerCompanyName}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-2xl p-4 text-left transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 ${
        selected ? "bg-neutral-50" : "bg-white"
      }`}
      style={selected ? { border: "1px solid #090909" } : card}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-neutral-900">
            EG-{order.id} · {order.listingTitle ?? "Listing"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {counterparty} · {formatQuantity(order)} · {isPickupOrder(order) ? "Pickup" : "Delivery"}
          </p>
          {order.fulfilmentLocked && !isClosedOrder(order) && (
            <p className="mt-1 text-xs font-semibold text-amber-700">Dispute lock · actions paused</p>
          )}
        </div>
        <StagePill order={order} />
      </div>
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-neutral-900">{value ?? "Not recorded"}</dd>
    </div>
  );
}

function OrderDetail({
  order,
  portal,
  carriers,
  onChanged,
}: {
  order: LogisticsOrder;
  portal: LogisticsPortal;
  carriers: Workspace["carriers"];
  onChanged: (notice: string) => Promise<void>;
}) {
  const shipment = order.shipment;
  const quote = order.quote;
  const pickup = isPickupOrder(order);

  return (
    <section className="min-w-0 space-y-5 rounded-2xl bg-white p-4 sm:p-5" style={card} aria-labelledby="logistics-detail-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="logistics-detail-heading" className="text-xl font-bold text-neutral-900">
            EG-{order.id} · {order.listingTitle ?? "Listing"}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">{nextStepCopy(order, portal)}</p>
        </div>
        <StagePill order={order} />
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label="Seller" value={order.sellerCompanyName} />
        <Fact label="Buyer" value={order.buyerCompanyName} />
        <Fact label="Quantity" value={formatQuantity(order)} />
        <Fact label="Fulfilment" value={pickup ? "Buyer pickup" : "Delivery"} />
        <Fact label="Origin" value={shipment?.originName ?? null} />
        <Fact
          label={pickup ? "Pickup location" : "Delivery address"}
          value={pickup ? (shipment?.originName ?? null) : (order.deliveryAddress ?? shipment?.destinationName ?? null)}
        />
        {shipment && (
          <>
            <Fact label="Carrier" value={shipment.carrierName} />
            <Fact label="Scheduled pickup" value={formatDateTime(shipment.pickupScheduledAt)} />
            <Fact label="Carrier reference" value={shipment.trackingNumber} />
            <Fact label="Receipt recorded" value={formatDateTime(shipment.deliveryConfirmedAt)} />
          </>
        )}
        {shipment?.receiverName && <Fact label={pickup ? "Collected by" : "Received by"} value={shipment.receiverName} />}
        {shipment?.deliveryNotes && <Fact label="Receipt notes" value={shipment.deliveryNotes} />}
      </dl>

      {quote && (
        <div className="rounded-xl bg-neutral-50 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-neutral-900">Shipping quote</p>
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {quote.status === "accepted" ? "Accepted by buyer" : "Awaiting buyer"}
            </span>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Fact label="Amount" value={formatMoney(quote.amount, quote.currencyCode)} />
            <Fact label="Carrier" value={quote.carrierName} />
            <Fact label="Pickup" value={formatDateTime(quote.pickupScheduledAt)} />
            <Fact label="Estimated delivery" value={formatDateTime(quote.estimatedDeliveryAt)} />
          </dl>
          {quote.note && <p className="mt-3 text-neutral-700">Note: {quote.note}</p>}
          <p className="mt-3 text-xs text-neutral-500">
            Manually recorded quote. EcoGlobe staff coordinate the carrier; no booking or payment is made through this page.
          </p>
        </div>
      )}

      <LogisticsOrderActions order={order} carriers={carriers} portal={portal} onChanged={onChanged} />

      {shipment && hasCoordinates(shipment) && <SavedShipmentMap shipment={shipment} />}
    </section>
  );
}
