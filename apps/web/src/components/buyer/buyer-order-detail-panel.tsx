"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  X,
  MoreHorizontal,
  Info,
  Download,
  ScrollText,
  Package,
  Copy,
  Share2,
  Check,
  ChevronDown,
  Printer,
  Mail,
  AlertCircle,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerPaymentMethodScreen } from "./buyer-payment-method-screen";
import { PanelHeaderMenu, downloadTextFile } from "./panel-header-menu";
import { DocumentRow } from "./document-row";

type ActiveModal =
  | "request-changes"
  | "quote-approved"
  | "confirm-pickup"
  | "pickup-success"
  | "confirm-delivery"
  | "report-issue"
  | "delivery-verified"
  | "dispute-submitted"
  | null;

function Modal({
  children,
  onClose,
  width = "max-w-[480px]",
}: {
  children: React.ReactNode;
  onClose?: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${width} rounded-2xl bg-white p-6 shadow-2xl`}>
        {onClose && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function ScrollCheckIcon() {
  return (
    <div className="relative">
      <ScrollText
        className="size-12 text-amber-500"
        strokeWidth={1.5}
        fill="#FCD9A4"
      />
      <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-green-500 text-white">
        <Check className="size-4" strokeWidth={3} />
      </div>
    </div>
  );
}

function ScrollDisputeIcon() {
  return (
    <div className="relative">
      <ScrollText
        className="size-12 text-amber-500"
        strokeWidth={1.5}
        fill="#FCD9A4"
      />
      <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-red-500 text-white">
        <X className="size-4" strokeWidth={3} />
      </div>
    </div>
  );
}

export interface OrderDetail {
  orderId: string;
  shipping: "Pickup" | "Delivery";
  status: string;
  orderPlaced: string;
  seller: string;
  quantity: string;
  product: {
    name: string;
    price: string;
    unit: string;
    image: string;
  };
  quote?: {
    eta: string;
    distance: string;
    shippingCost: string;
    sellerNote: string;
  };
  pickupCode?: string;
  delivery?: {
    buyer: string;
    contact: string;
    phone: string;
    email: string;
    location: string;
    notes?: string;
  };
  pickup?: {
    facility: string;
    contact: string;
    phone: string;
    email: string;
    pickupDate: string;
    operatingHours: string;
    vehicleType: string;
    plateNumber: string;
    location: string;
    notes?: string;
  };
  payment: {
    transactionId: string;
    escrowAmount: string;
    escrowStatus: string;
    releaseDate: string;
  };
  documents: { name: string }[];
  activity: { label: string; date?: string; complete: boolean }[];
  summary: {
    productCount: number;
    itemSubtotal: string;
    shipping?: string;
    fees: string;
    total: string;
  };
}

interface Props {
  order: OrderDetail | null;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl bg-white p-6"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <h2 className="mb-5 text-lg font-bold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

export function BuyerOrderDetailPanel({ order, onClose }: Props) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [requestText, setRequestText] = useState("");
  const [paymentScreenOpen, setPaymentScreenOpen] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [issueDetails, setIssueDetails] = useState("");
  const [issueFile, setIssueFile] = useState<File | null>(null);
  const activeModalRef = useRef<ActiveModal>(null);
  activeModalRef.current = activeModal;

  useEffect(() => {
    if (!order) {
      setActiveModal(null);
      setRequestText("");
      setPaymentScreenOpen(false);
      setIssueType("");
      setIssueDetails("");
      setIssueFile(null);
    }
  }, [order]);

  useEffect(() => {
    if (!order) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const current = activeModalRef.current;
      if (current && current !== "pickup-success") {
        setActiveModal(null);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [order, onClose]);

  if (!order) return null;

  const isQuoteAwaiting = order.status === "Quote awaiting approval";
  const isReadyForPickup = order.status === "Ready for pickup";
  const isAwaitingPayment = order.status === "Awaiting payment";
  const isBuyerVerification = order.status === "Buyer verification";
  const headerCta = isQuoteAwaiting
    ? "Approve Quote"
    : isReadyForPickup
      ? "Confirm Pickup Completed"
      : isAwaitingPayment
        ? "Payment Method"
        : isBuyerVerification
          ? "Mark as Delivered"
          : null;

  const handleCopyCode = async () => {
    if (!order.pickupCode) return;
    try {
      await navigator.clipboard.writeText(order.pickupCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={`Order ${order.orderId} details`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[1080px] flex-col bg-neutral-50 shadow-2xl"
      >
        {/* Header */}
        <header
          className="flex items-start justify-between gap-4 bg-white px-8 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold text-neutral-900">
              Order ID: {order.orderId}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-neutral-500">
              {order.shipping}
              <span className="text-neutral-300">•</span>
              {order.status}
              <Info className="size-3.5 text-neutral-400" />
            </p>
          </div>
          <div className="flex items-center gap-3">
            {headerCta && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (isQuoteAwaiting) setActiveModal("quote-approved");
                  else if (isReadyForPickup) setActiveModal("confirm-pickup");
                  else if (isAwaitingPayment) setPaymentScreenOpen(true);
                  else if (isBuyerVerification)
                    setActiveModal("confirm-delivery");
                }}
              >
                {headerCta}
              </Button>
            )}
            <PanelHeaderMenu
              items={[
                {
                  label: "Print order",
                  icon: Printer,
                  onClick: () => window.print(),
                },
                {
                  label: "Download invoice",
                  icon: Download,
                  onClick: () =>
                    downloadTextFile(
                      `${order.orderId}-invoice.txt`,
                      `EcoGlobe order invoice\nOrder ID: ${order.orderId}\nStatus: ${order.status}\nSeller: ${order.seller}\nQuantity: ${order.quantity}\nProduct: ${order.product.name}\nTotal: ${order.summary.total}\n`,
                    ),
                },
                {
                  label: "Contact seller",
                  icon: Mail,
                  onClick: () => {
                    window.location.href = `mailto:info@ecoglobeworld.com?subject=Order ${order.orderId}`;
                  },
                },
                {
                  label: "Report an issue",
                  icon: AlertCircle,
                  destructive: true,
                  onClick: () => setActiveModal("report-issue"),
                },
              ]}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order details"
              className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left column */}
            <div className="flex flex-col gap-5">
              {order.pickupCode && (
                <section
                  className="rounded-2xl bg-white p-6"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                      <Package className="size-5 text-neutral-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-neutral-900">
                        Ready for pickup
                      </p>
                      <p className="text-sm text-neutral-500">
                        Your order is ready. Please schedule pickup and bring
                        your pickup code.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="More"
                      className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                  <div
                    className="mt-5 flex items-center justify-between rounded-xl bg-neutral-50 px-5 py-4"
                    style={{ border: "1px solid #F0F0F0" }}
                  >
                    <p className="text-sm">
                      <span className="text-neutral-500">Pickup Code:</span>{" "}
                      <span className="font-bold text-neutral-900">
                        {order.pickupCode}
                      </span>
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Share pickup code"
                        className="flex size-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200"
                      >
                        <Share2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        aria-label="Copy pickup code"
                        className="flex size-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200"
                      >
                        {codeCopied ? (
                          <Check className="size-4 text-green-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {order.quote && (
                <section
                  className="rounded-2xl bg-white p-6"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                      <ScrollText className="size-5 text-neutral-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-neutral-900">
                        Quote awaiting approval
                      </p>
                      <p className="text-sm text-neutral-500">
                        Review and approve shipping quote
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveModal("request-changes")}
                      >
                        Request Changes
                      </Button>
                      <button
                        type="button"
                        aria-label="More"
                        className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="mt-5 rounded-xl bg-neutral-50 p-5"
                    style={{ border: "1px solid #F0F0F0" }}
                  >
                    <div className="grid grid-cols-3 gap-6">
                      <Field label="ETA" value={order.quote.eta} />
                      <Field label="Distance" value={order.quote.distance} />
                      <Field
                        label="Shipping cost"
                        value={order.quote.shippingCost}
                      />
                    </div>
                    <p className="mt-4 text-sm text-neutral-700">
                      <span className="font-semibold">Seller note:</span>{" "}
                      {order.quote.sellerNote}
                    </p>
                  </div>
                </section>
              )}

              <SectionCard title="Order info">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Order ID" value={order.orderId} />
                  <Field label="Order Placed" value={order.orderPlaced} />
                  <Field label="Seller" value={order.seller} />
                  <Field label="Status" value={order.status} />
                  <Field label="Shipping" value={order.shipping} />
                  <Field label="Quantity" value={order.quantity} />
                </div>
              </SectionCard>

              <SectionCard title="Products">
                <div className="flex items-center gap-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <img
                      src={order.product.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-base font-bold text-neutral-900">
                      {order.product.name}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {order.product.price}{" "}
                      <span className="text-neutral-400">
                        /{order.product.unit}
                      </span>
                    </p>
                  </div>
                </div>
              </SectionCard>

              {order.delivery && (
                <SectionCard title="Delivery info">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <Field label="Buyer" value={order.delivery.buyer} />
                    <Field
                      label="Contact person"
                      value={order.delivery.contact}
                    />
                    <Field label="Phone number" value={order.delivery.phone} />
                    <Field label="Email" value={order.delivery.email} />
                  </div>
                  <div className="mt-5 flex flex-col gap-1">
                    <span className="text-sm text-neutral-500">Location</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {order.delivery.location}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-col gap-1">
                    <span className="text-sm text-neutral-500">Notes</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {order.delivery.notes || "-"}
                    </span>
                  </div>
                </SectionCard>
              )}

              {order.pickup && (
                <SectionCard title="Pickup Details">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <Field
                      label="Facility name"
                      value={order.pickup.facility}
                    />
                    <Field
                      label="Contact person"
                      value={order.pickup.contact}
                    />
                    <Field label="Phone number" value={order.pickup.phone} />
                    <Field label="Email" value={order.pickup.email} />
                    <Field
                      label="Pickup date"
                      value={order.pickup.pickupDate}
                    />
                    <Field
                      label="Operating hours"
                      value={order.pickup.operatingHours}
                    />
                    <Field
                      label="Vehicle type"
                      value={order.pickup.vehicleType}
                    />
                    <Field
                      label="Plate number"
                      value={order.pickup.plateNumber}
                    />
                  </div>
                  <div className="mt-5 flex flex-col gap-1">
                    <span className="text-sm text-neutral-500">Location</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {order.pickup.location}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-col gap-1">
                    <span className="text-sm text-neutral-500">Notes</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {order.pickup.notes || "-"}
                    </span>
                  </div>
                </SectionCard>
              )}

              <SectionCard title="Payment Details">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <Field
                    label="Transaction ID"
                    value={order.payment.transactionId}
                  />
                  <Field
                    label="Escrow amount"
                    value={order.payment.escrowAmount}
                  />
                  <Field
                    label="Escrow status"
                    value={order.payment.escrowStatus}
                  />
                  <Field
                    label="Release date"
                    value={order.payment.releaseDate}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Documents">
                <div className="flex flex-col gap-3">
                  {order.documents.map((doc, i) => (
                    <DocumentRow key={`${doc.name}-${i}`} name={doc.name} />
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Activity Log">
                <ol className="flex flex-col">
                  {order.activity.map((item, i) => {
                    const isLast = i === order.activity.length - 1;
                    return (
                      <li key={item.label} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                              item.complete
                                ? "bg-green-500"
                                : "bg-neutral-300"
                            }`}
                          />
                          {!isLast && (
                            <span
                              className={`my-1 w-px flex-1 ${
                                item.complete
                                  ? "bg-green-500"
                                  : "bg-neutral-200"
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex flex-1 items-center justify-between gap-4 pb-4">
                          <span
                            className={`text-sm ${
                              item.complete
                                ? "font-medium text-neutral-900"
                                : "text-neutral-500"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.date && (
                            <span className="text-sm text-neutral-500">
                              {item.date}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </SectionCard>
            </div>

            {/* Right column - Summary */}
            <aside className="lg:sticky lg:top-0 lg:self-start">
              <div className="rounded-2xl bg-neutral-100 p-6">
                <h2 className="text-2xl font-bold text-neutral-900">Summary</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {order.summary.productCount} product
                  {order.summary.productCount === 1 ? "" : "s"}
                </p>
                <div
                  className="my-5"
                  style={{ borderTop: "1px solid #E0E0E0" }}
                />
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">Item subtotal</span>
                    <span className="font-medium text-neutral-900">
                      {order.summary.itemSubtotal}
                    </span>
                  </div>
                  {order.summary.shipping && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-700">Shipping</span>
                      <span className="font-medium text-neutral-900">
                        {order.summary.shipping}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">Fees</span>
                    <span className="font-medium text-neutral-900">
                      {order.summary.fees}
                    </span>
                  </div>
                </div>
                <div
                  className="my-5"
                  style={{ borderTop: "1px solid #E0E0E0" }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-neutral-900">
                    Total
                  </span>
                  <span className="text-base font-bold text-neutral-900">
                    {order.summary.total}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </aside>

      {activeModal === "request-changes" && (
        <Modal onClose={() => setActiveModal(null)}>
          <div className="-mt-2">
            <h2 className="text-2xl font-bold text-neutral-900">
              Request changes
            </h2>
            <div className="mt-6 flex flex-col gap-2">
              <label
                htmlFor="request-text"
                className="text-sm font-medium text-neutral-900"
              >
                Your request
              </label>
              <textarea
                id="request-text"
                rows={5}
                placeholder="Write your request"
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                className="w-full resize-none rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                style={{ border: "1px solid #E0E0E0" }}
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setActiveModal(null);
                  setRequestText("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!requestText.trim()}
                style={
                  !requestText.trim()
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : undefined
                }
                onClick={() => {
                  setActiveModal(null);
                  setRequestText("");
                }}
              >
                Send Request
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === "quote-approved" && (
        <Modal>
          <div className="flex flex-col items-center px-4 py-6 text-center">
            <ScrollCheckIcon />
            <h2 className="mt-6 text-2xl font-bold text-neutral-900">
              Shipping quote approved
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              Your order total has been updated. Fund escrow to begin
              processing.
            </p>
            <Button
              variant="primary"
              size="md"
              className="mt-8 min-w-[160px]"
              onClick={() => setActiveModal(null)}
            >
              Continue
            </Button>
          </div>
        </Modal>
      )}

      {activeModal === "confirm-pickup" && (
        <Modal>
          <div className="flex flex-col items-center px-4 py-6 text-center">
            <ScrollCheckIcon />
            <h2 className="mt-6 text-2xl font-bold text-neutral-900">
              Confirm pickup completion?
            </h2>
            <p className="mt-3 max-w-[360px] text-sm text-neutral-500">
              Once confirmed, this action cannot be undone. Escrow funds will
              move to the verification stage.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveModal("pickup-success")}
              >
                Yes, confirm
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === "confirm-delivery" && (
        <Modal onClose={() => setActiveModal(null)}>
          <div className="flex flex-col items-center px-4 py-6 text-center">
            <ScrollText
              className="size-12 text-amber-500"
              strokeWidth={1.5}
              fill="#FCD9A4"
            />
            <h2 className="mt-6 text-2xl font-bold text-neutral-900">
              Confirm delivery
            </h2>
            <p className="mt-3 max-w-[400px] text-sm text-neutral-500">
              Confirm you received the shipment and verify the material before
              escrow is released.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setActiveModal("report-issue")}
              >
                Report an Issue
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveModal("delivery-verified")}
              >
                Confirm Delivery
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === "report-issue" && (
        <Modal
          width="max-w-[760px]"
          onClose={() => {
            setActiveModal(null);
            setIssueType("");
            setIssueDetails("");
            setIssueFile(null);
          }}
        >
          <div className="-mt-2">
            <h2 className="text-2xl font-bold text-neutral-900">
              Report an Issue
            </h2>
            <div
              className="mt-6"
              style={{ borderTop: "1px solid #F0F0F0" }}
            />
            <div className="mt-6 flex flex-col gap-2">
              <label
                htmlFor="issue-type"
                className="text-sm font-medium text-neutral-900"
              >
                Select issue type
              </label>
              <div className="relative">
                <select
                  id="issue-type"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full appearance-none rounded-lg bg-white px-4 py-3 pr-11 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
                  style={{ border: "1px solid #E0E0E0" }}
                >
                  <option value="">-- Choose --</option>
                  <option value="damaged">Damaged on arrival</option>
                  <option value="wrong-quantity">Wrong quantity</option>
                  <option value="quality">Quality does not match specs</option>
                  <option value="missing-docs">Missing documentation</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-900">
                Attach proof
              </label>
              <label
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 py-4 text-sm text-neutral-700 hover:bg-neutral-50"
                style={{ border: "1px dashed #D0D0D0" }}
              >
                <span>
                  {issueFile ? (
                    <span className="font-medium text-neutral-900">
                      {issueFile.name}
                    </span>
                  ) : (
                    <>
                      Drop file here or{" "}
                      <span className="font-medium text-neutral-900 underline">
                        Browse
                      </span>
                    </>
                  )}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setIssueFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <label
                htmlFor="issue-details"
                className="text-sm font-medium text-neutral-900"
              >
                Details
              </label>
              <textarea
                id="issue-details"
                rows={4}
                placeholder="Write a description"
                value={issueDetails}
                onChange={(e) => setIssueDetails(e.target.value)}
                className="w-full resize-none rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                style={{ border: "1px solid #E0E0E0" }}
              />
            </div>
            <div
              className="mt-6"
              style={{ borderTop: "1px solid #F0F0F0" }}
            />
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setActiveModal(null);
                  setIssueType("");
                  setIssueDetails("");
                  setIssueFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!issueType || !issueDetails.trim()}
                style={
                  !issueType || !issueDetails.trim()
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : undefined
                }
                onClick={() => {
                  setActiveModal("dispute-submitted");
                  setIssueType("");
                  setIssueDetails("");
                  setIssueFile(null);
                }}
              >
                Submit
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === "delivery-verified" && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white">
          <header className="flex items-center justify-between px-6 py-4 sm:px-10">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={110}
              height={32}
              className="invert"
              priority
            />
            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                onClose();
              }}
              aria-label="Close"
              className="flex size-10 items-center justify-center rounded-full hover:bg-neutral-100"
            >
              <X className="size-5 text-neutral-500" />
            </button>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="text-6xl">🎉</span>
            <h1 className="mt-6 text-3xl font-bold text-neutral-900">
              Your delivery has been verified
            </h1>
            <p className="mt-3 max-w-[520px] text-base text-neutral-500">
              We&apos;ve recorded your delivery confirmation. Escrow release is
              now in progress, and the seller will be paid after final
              processing.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-8 min-w-[160px]"
              onClick={() => {
                setActiveModal(null);
                onClose();
              }}
            >
              Okay
            </Button>
          </div>
        </div>
      )}

      {activeModal === "dispute-submitted" && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white">
          <header className="flex items-center justify-between px-6 py-4 sm:px-10">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={110}
              height={32}
              className="invert"
              priority
            />
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Close"
              className="flex size-10 items-center justify-center rounded-full hover:bg-neutral-100"
            >
              <X className="size-5 text-neutral-500" />
            </button>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ScrollDisputeIcon />
            <h1 className="mt-6 text-3xl font-bold text-neutral-900">
              Dispute submitted
            </h1>
            <p className="mt-3 max-w-[520px] text-base text-neutral-500">
              Escrow will remain on hold while EcoGlobe reviews the issue with
              the seller.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-8 min-w-[200px]"
              onClick={() => setActiveModal(null)}
            >
              Back to order details
            </Button>
          </div>
        </div>
      )}

      {paymentScreenOpen && (
        <BuyerPaymentMethodScreen
          order={{
            orderId: order.orderId,
            shipping: order.shipping,
            seller: order.seller,
            total: order.summary.total,
          }}
          onBack={() => setPaymentScreenOpen(false)}
          onCloseAll={() => {
            setPaymentScreenOpen(false);
            onClose();
          }}
        />
      )}

      {activeModal === "pickup-success" && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white">
          <header className="flex items-center justify-between px-6 py-4 sm:px-10">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={110}
              height={32}
              className="invert"
              priority
            />
            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                onClose();
              }}
              aria-label="Close"
              className="flex size-10 items-center justify-center rounded-full hover:bg-neutral-100"
            >
              <X className="size-5 text-neutral-500" />
            </button>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="text-6xl">🎉</span>
            <h1 className="mt-6 text-3xl font-bold text-neutral-900">
              Pickup confirmed
            </h1>
            <p className="mt-3 text-base text-neutral-500">
              Thank you! Your order has been marked as complete.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-8 min-w-[160px]"
              onClick={() => {
                setActiveModal(null);
                onClose();
              }}
            >
              Okay
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
