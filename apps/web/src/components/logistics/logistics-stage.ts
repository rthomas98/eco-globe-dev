import type { LogisticsOrder } from "@/lib/api-logistics";

export type LogisticsPortal = "buyer" | "seller" | "admin";

/**
 * One derived stage per order so every portal labels the same persisted
 * record the same way. Derived only from workspace fields.
 */
export type LogisticsStage =
  | { kind: "cancelled" }
  | { kind: "pickup_waiting" }
  | { kind: "pickup_ready" }
  | { kind: "pickup_received" }
  | { kind: "pickup_reconciliation" }
  | { kind: "order_pending" }
  | { kind: "needs_quote" }
  | { kind: "quote_offered" }
  | { kind: "bol_needed" }
  | { kind: "ready_to_dispatch" }
  | { kind: "in_transit" }
  | { kind: "delivered" }
  | { kind: "exception" }
  | { kind: "completed_without_shipment" };

export const CLOSED_ORDER_STATUSES = ["cancelled", "completed"] as const;

export function isClosedOrder(order: LogisticsOrder) {
  return (CLOSED_ORDER_STATUSES as readonly string[]).includes(order.orderStatusCode);
}

export function isPickupOrder(order: LogisticsOrder) {
  return order.shippingTypeCode === "pickup";
}

export function logisticsStage(order: LogisticsOrder): LogisticsStage {
  const shipment = order.shipment;
  if (shipment?.statusCode === "delivered")
    return { kind: isPickupOrder(order) ? "pickup_received" : "delivered" };
  if (order.orderStatusCode === "cancelled") return { kind: "cancelled" };
  if (isPickupOrder(order)) {
    if (order.orderStatusCode === "completed") return { kind: "pickup_received" };
    if (order.orderStatusCode !== "in_progress") return { kind: "pickup_waiting" };
    // The backend confirms pickup only with no shipment or an in-transit one.
    if (shipment && shipment.statusCode !== "in_transit") return { kind: "pickup_reconciliation" };
    return { kind: "pickup_ready" };
  }
  if (shipment?.statusCode === "exception") return { kind: "exception" };
  // The backend accepts fulfilment actions only while the order is in progress.
  if (order.orderStatusCode !== "in_progress" && order.orderStatusCode !== "completed")
    return { kind: "order_pending" };
  if (shipment?.statusCode === "in_transit") return { kind: "in_transit" };
  if (shipment?.statusCode === "scheduled")
    return { kind: shipment.bolUploadedAt ? "ready_to_dispatch" : "bol_needed" };
  if (order.orderStatusCode === "completed") return { kind: "completed_without_shipment" };
  if (order.quote?.status === "offered") return { kind: "quote_offered" };
  return { kind: "needs_quote" };
}

type Tone = "neutral" | "amber" | "green" | "red" | "blue";

export function stageLabel(stage: LogisticsStage): { label: string; tone: Tone } {
  switch (stage.kind) {
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" };
    case "pickup_waiting":
      return { label: "Pickup · not yet ready", tone: "neutral" };
    case "pickup_ready":
      return { label: "Pickup · awaiting receipt", tone: "amber" };
    case "pickup_received":
      return { label: "Pickup received", tone: "green" };
    case "pickup_reconciliation":
      return { label: "Pickup · staff reconciliation", tone: "red" };
    case "order_pending":
      return { label: "Order not yet in progress", tone: "neutral" };
    case "needs_quote":
      return { label: "Needs shipping quote", tone: "amber" };
    case "quote_offered":
      return { label: "Quote awaiting buyer", tone: "blue" };
    case "bol_needed":
      return { label: "Scheduled · BOL needed", tone: "amber" };
    case "ready_to_dispatch":
      return { label: "Scheduled · ready to dispatch", tone: "blue" };
    case "in_transit":
      return { label: "In transit", tone: "blue" };
    case "delivered":
      return { label: "Delivered", tone: "green" };
    case "exception":
      return { label: "Exception · staff reviewing", tone: "red" };
    case "completed_without_shipment":
      return { label: "Completed", tone: "green" };
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
};

/** Whether the order needs something from this portal right now. */
export function needsActionFrom(order: LogisticsOrder, portal: LogisticsPortal) {
  const kind = logisticsStage(order).kind;
  if (order.fulfilmentLocked) return portal === "admin";
  if (portal === "buyer")
    return kind === "quote_offered" || kind === "in_transit" || kind === "pickup_ready";
  return (
    kind === "needs_quote" ||
    kind === "bol_needed" ||
    kind === "ready_to_dispatch" ||
    (portal === "admin" && (kind === "exception" || kind === "pickup_reconciliation"))
  );
}

export function nextStepCopy(order: LogisticsOrder, portal: LogisticsPortal) {
  if (order.fulfilmentLocked && !isClosedOrder(order))
    return "An open dispute locks fulfilment on this order. Logistics actions resume once EcoGlobe resolves it.";
  const kind = logisticsStage(order).kind;
  const buyer = portal === "buyer";
  switch (kind) {
    case "cancelled":
      return "This order was cancelled. No logistics action is available.";
    case "pickup_waiting":
      return "Pickup order. The buyer confirms receipt once the order is in progress and the material is collected.";
    case "pickup_ready":
      return buyer
        ? "Collect the material, inspect it and record receipt below."
        : "Awaiting the buyer's pickup receipt. No shipping quote is needed for pickup orders.";
    case "pickup_received":
      return "Pickup receipt recorded by the buyer.";
    case "pickup_reconciliation":
      return "This pickup order has a shipment record that must be reconciled by EcoGlobe staff before receipt can be recorded.";
    case "order_pending":
      return "Shipping can be arranged once the order is approved and in progress.";
    case "needs_quote":
      return buyer
        ? "The seller or EcoGlobe staff will record a shipping quote for your approval."
        : "Record a manual shipping quote for the buyer to review.";
    case "quote_offered":
      return buyer
        ? "Review the shipping quote. Accepting approves EcoGlobe staff to coordinate pickup; nothing is charged here."
        : "Waiting for the buyer to accept the quote. You can replace the offer until it is accepted.";
    case "bol_needed":
      return buyer
        ? "Shipment scheduled. The seller will attach the Bill of Lading before dispatch."
        : "Attach the Bill of Lading PDF before recording dispatch.";
    case "ready_to_dispatch":
      return buyer
        ? "Bill of Lading attached. Waiting for carrier pickup."
        : "Record dispatch when the carrier collects the load.";
    case "in_transit":
      return buyer
        ? "When the load arrives, inspect it and record receipt below."
        : "Dispatched. Waiting for the buyer to record receipt.";
    case "delivered":
      return "Receipt recorded by the buyer. Settlement is handled separately by EcoGlobe staff.";
    case "exception":
      return "EcoGlobe staff are reviewing this shipment.";
    case "completed_without_shipment":
      return "Order completed. No logistics record was saved for it.";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

export function formatQuantity(order: LogisticsOrder) {
  if (order.quantity === null) return "Quantity not recorded";
  return `${order.quantity.toLocaleString("en-US")} ${order.quantityUnitCode ?? ""}`.trim();
}
