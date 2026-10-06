"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Store,
  ChevronDown,
  Info,
  MoreHorizontal,
  X,
  Calendar,
  FileText,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import { SampleRequestsPanel } from "@/components/samples/sample-requests-panel";
import {
  BuyerOrderDetailPanel,
  OrderProductImage,
  type OrderDetail,
} from "./buyer-order-detail-panel";
import {
  cancelCheckout,
  fetchOrders,
  formatOrderDate,
  formatOrderMoney,
  orderListingImageSrc,
  orderUnitPrice,
  type ApiOrder,
} from "@/lib/api-orders";
import { takePendingCheckoutByOrder } from "@/lib/checkout-pending";
import { readDemoUser, useDemoUser } from "@/lib/demo-user";
import { describeBackendError } from "@/lib/backend-client";
import { cancelOrder, fetchShipments, numericOrderId } from "@/lib/api-fulfilment";

const BUYER_STATUS_BY_CODE: Record<string, OrderStatus> = {
  draft: "Awaiting seller confirmation",
  approval_required: "Quote awaiting approval",
  escrow_required: "Awaiting payment",
  awaiting_payment: "Awaiting payment",
  in_progress: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function mapApiOrderToBuyerRow(order: ApiOrder): Order {
  return {
    apiOrder: order,
    id: `api-${order.id}`,
    orderId: `EG-${order.id}`,
    orderPlaced: formatOrderDate(order.createdAt),
    shipping: order.deliveryMethod === "pickup" ? "Pickup" : "Delivery",
    // Only the saved unit; a missing unit is never assumed to be tons.
    qty: order.quantity
      ? [order.quantity, order.quantityUnit].filter((part) => part !== null && part !== "").join(" ")
      : "—",
    total: formatOrderMoney(order.totalAmount, order.currencyCode),
    status: BUYER_STATUS_BY_CODE[order.orderStatusCode] ?? "Processing",
    category: "Marketplace",
    seller: order.sellerCompanyName,
    product: order.listingTitle ?? "Marketplace order",
    // Only the listing's saved photo; never a title-matched stock image.
    productImage: orderListingImageSrc(order),
    // Per-unit price (the card appends the unit); the order total is `total`.
    productPrice: (() => {
      const unit = orderUnitPrice(order);
      return unit === null ? "—" : formatOrderMoney(unit, order.currencyCode);
    })(),
  };
}

export function buildOrderDetail(order: Order): OrderDetail {
  if (order.apiOrder) {
    const record = order.apiOrder;
    return {
      escrowRequired: record.escrowRequired,
      live: {
        funding: {
          id: record.id,
          buyerCompanyId: record.buyerCompanyId,
          creationSourceCode: record.creationSourceCode,
          totalAmount: record.totalAmount,
          currencyCode: record.currencyCode,
        },
        deliveryAddress: record.deliveryAddress,
        pickupRequestedAt: record.pickupRequestedAt,
        pickupContactName: record.pickupContactName ?? null,
        pickupContactPhone: record.pickupContactPhone ?? null,
        pickupVehicleDetails: record.pickupVehicleDetails ?? null,
      },
      orderId: order.orderId, shipping: order.shipping, status: order.status,
      orderPlaced: new Date(record.createdAt).toLocaleString(), seller: order.seller,
      quantity: order.qty, product: { name: order.product, price: order.productPrice, unit: record.quantityUnit ?? "", image: order.productImage },
      payment: { transactionId: "Not recorded", escrowAmount: "Not available", escrowStatus: "See payment records", releaseDate: "Not recorded" },
      documents: [], activity: [{ label: "Order placed", date: formatOrderDate(record.createdAt), complete: true }],
      summary: { productCount: 1, itemSubtotal: "Not recorded", fees: "Not recorded", total: order.total },
    };
  }
  // Every order on this page comes from the backend; nothing else is shown.
  return {
    orderId: order.orderId, shipping: order.shipping, status: order.status,
    orderPlaced: order.orderPlaced, seller: order.seller, quantity: order.qty,
    product: { name: order.product, price: order.productPrice, unit: "", image: order.productImage },
    payment: { transactionId: "Not recorded", escrowAmount: "Not available", escrowStatus: "See payment records", releaseDate: "Not recorded" },
    documents: [], activity: [],
    summary: { productCount: 1, itemSubtotal: "Not recorded", fees: "Not recorded", total: order.total },
  };
}

type OrderStatus =
  | "Quote awaiting approval"
  | "Awaiting seller confirmation"
  | "Awaiting payment"
  | "Ready for pickup"
  | "Buyer verification"
  | "Processing"
  | "Shipped"
  | "Completed"
  | "Cancelled";

type Tab =
  | "All Order"
  | "Action needed"
  | "Processing"
  | "Shipped"
  | "Completed"
  | "Cancelled";

export interface Order {
  apiOrder?: ApiOrder;
  id: string;
  orderId: string;
  orderPlaced: string;
  shipping: "Pickup" | "Delivery";
  qty: string;
  total: string;
  status: OrderStatus;
  category: string;
  seller: string;
  product: string;
  productImage: string;
  productPrice: string;
}

const tabs: Tab[] = [
  "All Order",
  "Action needed",
  "Processing",
  "Shipped",
  "Completed",
  "Cancelled",
];

const categories = ["Plastic", "Wood", "Rubber", "Metals", "Biomass"];

interface Filters {
  categories: string[];
  date: string;
}

const defaultFilters: Filters = { categories: [], date: "" };

const STATUS_COLORS: Record<OrderStatus, string> = {
  "Quote awaiting approval": "bg-amber-500",
  "Awaiting seller confirmation": "bg-amber-500",
  "Awaiting payment": "bg-amber-500",
  "Ready for pickup": "bg-blue-500",
  "Buyer verification": "bg-blue-500",
  Processing: "bg-blue-500",
  Shipped: "bg-blue-500",
  Completed: "bg-green-500",
  Cancelled: "bg-red-500",
};

const STATUS_INFO: Record<OrderStatus, { summary: string; nextStep: string }> = {
  "Quote awaiting approval": {
    summary: "The seller has sent a shipping quote.",
    nextStep: "Review the quote and approve to move the order forward.",
  },
  "Awaiting seller confirmation": {
    summary: "Your order is with the seller.",
    nextStep: "They'll confirm details and prepare your shipment.",
  },
  "Awaiting payment": {
    summary: "Payment is required before this order proceeds.",
    nextStep: "Open Order Details to check payment status or cancel the unpaid reservation.",
  },
  "Ready for pickup": {
    summary: "The seller has marked your order ready.",
    nextStep: "Arrange the pickup with the seller, then confirm receipt in Order Details.",
  },
  "Buyer verification": {
    summary: "Your shipment has arrived.",
    nextStep: "Confirm receipt in Order Details, or report an issue. Confirming receipt does not release funds; EcoGlobe staff handle settlement.",
  },
  Processing: {
    summary: "The seller is preparing your order.",
    nextStep: "You'll be notified when it ships.",
  },
  Shipped: {
    summary: "Your order is in transit.",
    nextStep: "Track its progress here until it arrives.",
  },
  Completed: {
    summary: "Receipt of this order is recorded.",
    nextStep: "Payment, escrow and refund details appear in Order Details only where they are saved.",
  },
  Cancelled: {
    summary: "This order was cancelled.",
    nextStep: "If you paid for this order, EcoGlobe staff review and issue any refund manually.",
  },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const [open, setOpen] = useState(false);
  const info = STATUS_INFO[status];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm transition-colors hover:bg-neutral-50"
        style={{ border: "1px solid #E0E0E0" }}
      >
        <span className="text-neutral-500">Status:</span>
        <span className={`size-2 rounded-full ${STATUS_COLORS[status]}`} />
        <span className="font-bold text-neutral-900">{status}</span>
        <Info className="size-3.5 text-neutral-400" />
        <ChevronDown
          className={`size-3.5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            className="absolute right-0 top-[calc(100%+8px)] z-40 w-[320px] rounded-xl bg-white p-4"
            style={{
              border: "1px solid #F0F0F0",
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className={`size-2 rounded-full ${STATUS_COLORS[status]}`} />
              <span className="text-sm font-bold text-neutral-900">{status}</span>
            </div>
            <p className="text-sm text-neutral-700">{info.summary}</p>
            <p className="mt-2 text-sm text-neutral-500">{info.nextStep}</p>
          </div>
        </>
      )}
    </div>
  );
}

function MoreMenu({
  order,
  onViewDetails,
  onCancel,
}: {
  order: Order;
  onViewDetails: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // A listing checkout can be cancelled here only while it awaits payment.
  // Past that point its payment state needs review (the status alone does not
  // prove it was paid), so the buyer opens the details, where refund
  // eligibility is read from the backend.
  const checkoutRequiresReview =
    order.apiOrder?.creationSourceCode === "listing_checkout" &&
    order.apiOrder.orderStatusCode !== "awaiting_payment";
  const canCancel =
    order.status !== "Completed" && order.status !== "Cancelled" && !checkoutRequiresReview;

  const items: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
  }[] = [
    { label: "View details", icon: FileText, onClick: onViewDetails },
    { label: "Track order", icon: Truck, onClick: onViewDetails },
    {
      label: "View payment records",
      icon: FileText,
      onClick: () => router.push("/buyer/accounting/payments"),
    },
    // Refunds are staff-run and never automatic; Order Details shows the
    // request form only when the backend reports the order eligible.
    checkoutRequiresReview && order.status !== "Cancelled"
      ? { label: "Payment and refund details", icon: FileText, onClick: onViewDetails }
      : {
          label: "Cancel order",
          icon: XCircle,
          onClick: onCancel,
          disabled: !canCancel,
          destructive: true,
        },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+4px)] z-40 w-[200px] rounded-xl bg-white py-2"
            style={{
              border: "1px solid #F0F0F0",
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                  item.disabled
                    ? "cursor-not-allowed text-neutral-300"
                    : item.destructive
                      ? "text-red-600 hover:bg-red-50"
                      : "text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrderCard({
  order,
  shipmentStates,
  onOpen,
  onCancel,
}: {
  order: Order;
  /** Saved shipment states for this order (empty when none were read). */
  shipmentStates: string[];
  onOpen: () => void;
  onCancel: () => void;
}) {
  const showReviewQuote = order.status === "Quote awaiting approval";

  return (
    <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      {/* Top row */}
      <div
        className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4"
        style={{ borderBottom: "1px solid #F0F0F0" }}
      >
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">Order ID</span>
          <span className="text-sm font-medium text-neutral-900">{order.orderId}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">Order Placed</span>
          <span className="text-sm font-medium text-neutral-900">{order.orderPlaced}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">Shipping</span>
          <span className="text-sm font-medium text-neutral-900">{order.shipping}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">Qty</span>
          <span className="text-sm font-medium text-neutral-900">{order.qty}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">Total</span>
          <span className="text-sm font-medium text-neutral-900">{order.total}</span>
        </div>
        <div className="ml-auto">
          <StatusBadge status={order.status} />
          {shipmentStates.length > 0 && (
            <p className="mt-1 text-right text-xs text-neutral-500">
              Shipment: {shipmentStates.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-4">
        <div className="flex w-full items-center gap-2 text-sm font-bold text-neutral-900">
          <Store className="size-4" />
          {order.seller}
        </div>
        <div className="flex flex-1 items-center gap-4">
          <OrderProductImage src={order.productImage} title={order.product} />
          <div>
            <p className="text-base font-bold text-neutral-900">{order.product}</p>
            <p className="text-sm text-neutral-500">
              {order.productPrice}{order.productPrice !== "—" && order.apiOrder?.quantityUnit && <span className="text-neutral-400"> / {order.apiOrder.quantityUnit}</span>}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          {showReviewQuote && (
            <Button variant="primary" size="md" className="flex-1 sm:flex-none" onClick={onOpen}>
              Review Quote
            </Button>
          )}
          <Button variant="secondary" size="md" className="flex-1 sm:flex-none" onClick={onOpen}>
            Order Details
          </Button>
          <MoreMenu order={order} onViewDetails={onOpen} onCancel={onCancel} />
        </div>
      </div>
    </div>
  );
}

function CompletedTable({ items, onOpen }: { items: Order[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      <table className="w-full min-w-[860px]">
        <thead>
          <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <th className="px-6 py-4 text-sm font-medium text-neutral-700">Order ID</th>
            <th className="px-6 py-4 text-sm font-medium text-neutral-700">Product</th>
            <th className="px-6 py-4 text-sm font-medium text-neutral-700">Qty</th>
            <th className="px-6 py-4 text-sm font-medium text-neutral-700">Shipping type</th>
            <th className="px-6 py-4 text-sm font-medium text-neutral-700">Total</th>
            <th className="px-6 py-4 text-sm font-medium text-neutral-700">Order Placed</th>
            <th className="px-6 py-4 text-sm font-medium text-neutral-700">Status</th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr
              key={o.id}
              className="hover:bg-neutral-50"
              style={{ borderTop: "1px solid #F8F8F8" }}
            >
              <td className="px-6 py-4 text-sm text-neutral-900">{o.orderId}</td>
              <td className="px-6 py-4 text-sm text-neutral-900">{o.product}</td>
              <td className="px-6 py-4 text-sm text-neutral-700">{o.qty}</td>
              <td className="px-6 py-4 text-sm text-neutral-700">{o.shipping}</td>
              <td className="px-6 py-4 text-sm text-neutral-900">{o.total}</td>
              <td className="px-6 py-4 text-sm text-neutral-700">{o.orderPlaced}</td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  {o.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => onOpen(o.id)}
                  className="text-sm font-semibold text-neutral-900 underline"
                >
                  Order details
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-16 text-center text-sm text-neutral-500">
                No completed orders.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FiltersPanel({
  open,
  onClose,
  filters,
  onChange,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
}) {
  if (!open) return null;

  const activeCount = filters.categories.length + (filters.date ? 1 : 0);

  const toggleCategory = (cat: string) => {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: next });
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed right-6 top-20 z-50 w-[460px] overflow-hidden rounded-2xl bg-white"
        style={{ border: "1px solid #F0F0F0", boxShadow: "0 16px 40px rgba(0,0,0,0.12)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">Filters</h2>
            {activeCount > 0 && (
              <span
                className="flex size-6 items-center justify-center rounded-full text-xs font-bold text-green-700"
                style={{ backgroundColor: "#DCFCE7" }}
              >
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          <h3 className="mb-3 text-base font-bold text-neutral-900">Category</h3>
          <div className="grid grid-cols-2 gap-y-3">
            {categories.map((cat) => (
              <label key={cat} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="sr-only peer"
                />
                <span
                  className="flex size-5 items-center justify-center rounded transition-colors peer-checked:bg-neutral-900"
                  style={{
                    border: filters.categories.includes(cat)
                      ? "1px solid #090909"
                      : "1px solid #D0D0D0",
                  }}
                >
                  {filters.categories.includes(cat) && (
                    <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="text-neutral-900">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6" style={{ borderTop: "1px solid #F0F0F0" }}>
          <h3 className="mb-3 mt-6 text-base font-bold text-neutral-900">Date</h3>
          <div className="relative">
            <input
              type="text"
              value={filters.date}
              onChange={(e) => onChange({ ...filters, date: e.target.value })}
              className="w-full rounded-lg bg-white px-4 py-3 pr-11 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
              style={{ border: "1px solid #E0E0E0" }}
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-neutral-500" />
          </div>
        </div>

        <div
          className="flex items-center justify-between gap-4 px-6 py-4"
          style={{ borderTop: "1px solid #F0F0F0" }}
        >
          <button
            onClick={onReset}
            className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
          >
            Reset
          </button>
          <Button variant="primary" size="md" onClick={onClose}>
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}

export function BuyerOrdersPage() {
  const [tab, setTab] = useState<Tab>("All Order");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const user = useDemoUser();
  const [loadedOrders, setOrderList] = useState<Order[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Bumped after a confirmed change (cancel, approve) to re-read orders.
  const [reloadKey, setReloadKey] = useState(0);
  // Saved shipment states by order id, shown beside the order status so the
  // list and the tracker describe the same records. Best effort: if this read
  // fails, nothing about shipments is claimed.
  const [shipmentStates, setShipmentStates] = useState<Map<number, string[]>>(new Map());
  const [loadedCompanyId, setLoadedCompanyId] = useState<number | undefined>(undefined);
  // Orders and shipment states read for another company are hidden in the
  // same render as a company switch, before the effect clears them.
  const sameCompany = loadedCompanyId === user?.activeCompanyId;
  const orderList = sameCompany ? loadedOrders : [];
  const visibleShipmentStates = sameCompany ? shipmentStates : new Map<number, string[]>();

  // Orders come only from the backend for the active buyer company. The list
  // is cleared only when the company changes, not on a same-company reload.
  useEffect(() => {
    if (loadedCompanyId !== user?.activeCompanyId) {
      setOrderList([]);
      setShipmentStates(new Map());
      setLoadError("");
      setLoaded(false);
      setLoadedCompanyId(user?.activeCompanyId);
    }
    if (!user?.activeCompanyId) {
      // No buyer company in this session (not just not-yet-read): nothing to load.
      if (!readDemoUser()?.activeCompanyId) setLoaded(true);
      return;
    }
    let cancelled = false;
    fetchShipments()
      .then((rows) => {
        if (cancelled) return;
        const byOrder = new Map<number, string[]>();
        for (const row of rows) {
          if (!row.orderId) continue;
          const label = (row.shipmentStatusName ?? row.shipmentStatusCode).replace(/_/g, " ").toLowerCase();
          byOrder.set(row.orderId, [...new Set([...(byOrder.get(row.orderId) ?? []), label])]);
        }
        setShipmentStates(byOrder);
      })
      .catch(() => {
        if (!cancelled) setShipmentStates(new Map());
      });
    fetchOrders({ buyerCompanyId: user.activeCompanyId })
      .then((apiOrders) => {
        if (!cancelled) { setOrderList(apiOrders.map(mapApiOrderToBuyerRow)); setLoadError(""); setLoaded(true); }
      })
      .catch(() => { if (!cancelled) { setLoadError("Orders could not be loaded. Please reload to retry."); setLoaded(true); } });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.activeCompanyId, reloadKey]);

  const handleCancel = (id: string) => {
    setConfirmCancelId(id);
  };

  const [cancelError, setCancelError] = useState<string | null>(null);
  // A cancellation shows only after the backend confirms it. Orders still
  // awaiting Stripe payment are cancelled through checkout (expires the
  // provider session and releases stock); others use the order endpoint.
  const confirmCancel = () => {
    if (!confirmCancelId) return;
    const target = orderList.find((o) => o.id === confirmCancelId);
    const liveId = target ? numericOrderId(target.orderId) : null;
    setConfirmCancelId(null);
    if (!liveId || !target) return;
    setCancelError(null);
    const viaCheckout = target.apiOrder?.orderStatusCode === "awaiting_payment";
    const request = viaCheckout
      ? cancelCheckout(liveId).then((result) => {
          if (result.status === "expired") takePendingCheckoutByOrder(liveId);
          if (result.status !== "expired")
            throw new Error(
              result.status === "paid"
                ? `Order ${target.orderId} is already paid and cannot be cancelled here.`
                : `Order ${target.orderId} is still processing payment. Try again shortly.`,
            );
        })
      : cancelOrder(liveId);
    void request
      .then(() =>
        setOrderList((prev) =>
          prev.map((o) => (o.id === target.id ? { ...o, status: "Cancelled" } : o)),
        ),
      )
      .catch((error) =>
        setCancelError(describeBackendError(error, `Order ${target.orderId} was not cancelled.`)),
      );
  };

  const tabFilters: Record<Tab, (o: Order) => boolean> = {
    "All Order": () => true,
    "Action needed": (o) =>
      o.status === "Quote awaiting approval" ||
      o.status === "Awaiting seller confirmation" ||
      o.status === "Awaiting payment" ||
      o.status === "Ready for pickup" ||
      o.status === "Buyer verification",
    Processing: (o) => o.status === "Processing",
    Shipped: (o) => o.status === "Shipped",
    Completed: (o) => o.status === "Completed",
    Cancelled: (o) => o.status === "Cancelled",
  };

  const filtered = orderList
    .filter(tabFilters[tab])
    .filter((o) => {
      if (filters.categories.length > 0 && !filters.categories.includes(o.category)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !o.orderId.toLowerCase().includes(q) &&
          !o.product.toLowerCase().includes(q) &&
          !o.seller.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col bg-neutral-50">
      {loadError && <p role="alert" className="p-4 text-red-700">{loadError}</p>}
      {cancelError && <p role="alert" className="p-4 text-red-700">{cancelError}</p>}
        {/* Top bar */}
        <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-8 sm:py-6">
          <h1 className="text-2xl font-bold text-neutral-900">My Orders</h1>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div
              className="flex min-w-[180px] flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 sm:flex-none"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <Search className="size-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 sm:w-40 sm:flex-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="px-4 pt-4 sm:px-8">
          <SampleRequestsPanel role="buyer" />
        </div>
        {/* Tabs */}
        <div
          className="flex items-center gap-8 overflow-x-auto px-4 sm:px-8"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          {tabs.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`relative shrink-0 pb-4 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-neutral-900" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
          {(!loaded || !sameCompany) && !loadError ? (
            <p role="status" className="py-16 text-center text-sm text-neutral-500">Loading orders…</p>
          ) : tab === "Completed" || tab === "Cancelled" ? (
            <CompletedTable items={filtered} onOpen={setSelectedOrderId} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-16 text-center">
              <p className="text-base font-semibold text-neutral-900">No orders</p>
              <p className="max-w-[360px] text-sm text-neutral-600">
                You don&apos;t have any {tab.toLowerCase()} orders yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  shipmentStates={o.apiOrder ? (visibleShipmentStates.get(o.apiOrder.id) ?? []) : []}
                  onOpen={() => setSelectedOrderId(o.id)}
                  onCancel={() => handleCancel(o.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <FiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      <BuyerOrderDetailPanel
        order={(() => {
          const selected = selectedOrderId ? orderList.find((o) => o.id === selectedOrderId) : undefined;
          return selected ? buildOrderDetail(selected) : null;
        })()}
        onClose={() => setSelectedOrderId(null)}
        onOrderChanged={() => setReloadKey((k) => k + 1)}
      />

      {confirmCancelId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-neutral-900">
              Cancel this order?
            </h2>
            <p className="mt-3 text-sm text-neutral-700">
              The seller will be notified. If you already paid, EcoGlobe staff
              review the order and issue any refund manually; it is not
              automatic. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setConfirmCancelId(null)}
              >
                Keep order
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={confirmCancel}
              >
                Yes, cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </BuyerLayout>
  );
}
