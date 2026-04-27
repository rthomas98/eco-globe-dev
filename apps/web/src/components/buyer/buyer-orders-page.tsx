"use client";

import { useState } from "react";
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
  MessageCircle,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import {
  BuyerOrderDetailPanel,
  type OrderDetail,
} from "./buyer-order-detail-panel";

function buildOrderDetail(order: Order): OrderDetail {
  const isQuoteAwaiting = order.status === "Quote awaiting approval";
  const isReadyForPickup = order.status === "Ready for pickup";
  const isPickup = order.shipping === "Pickup";

  const base = {
    orderId: order.orderId,
    shipping: order.shipping,
    status: order.status,
    orderPlaced: `${order.orderPlaced} 10:10 AM`,
    seller: order.seller,
    quantity: order.qty,
    product: {
      name: order.product,
      price: order.productPrice,
      unit: "tons",
      image: order.productImage,
    },
    payment: {
      transactionId: "TS93863",
      escrowAmount: "$2,500.00",
      escrowStatus: "Funded",
      releaseDate: "Oct 28, 2024 10:10 AM",
    },
  };

  if (isPickup) {
    return {
      ...base,
      pickupCode: isReadyForPickup ? "EG-PU-4921" : undefined,
      pickup: {
        facility: "Acme Company 2",
        contact: "Will Smith",
        phone: "012345678910",
        email: "example@mail.com",
        pickupDate: "12/12/2026",
        operatingHours: "09:00 AM - 09:00 PM",
        vehicleType: "Truck",
        plateNumber: "LKZ-9254",
        location: "2012 Rue Beauregard, STE 202, Lafayette, LA 70508",
      },
      documents: [
        { name: "Example data name.pdf" },
        { name: "Example data name.pdf" },
      ],
      activity: [
        {
          label: "Order placed",
          date: "Oct 29, 2024 10:10 AM",
          complete: true,
        },
        {
          label: "Escrow funded",
          date: "Oct 29, 2024 10:10 AM",
          complete: true,
        },
        { label: "Seller marked ready for pickup", complete: false },
        { label: "Pickup confirmed", complete: false },
        { label: "Escrow released", complete: false },
        { label: "Order completed", complete: false },
      ],
      summary: {
        productCount: 1,
        itemSubtotal: "$600.00",
        fees: "$2.00",
        total: "$602.00",
      },
    };
  }

  return {
    ...base,
    quote: isQuoteAwaiting
      ? {
          eta: "12/12/2026",
          distance: "120 mi",
          shippingCost: "$200.00",
          sellerNote: "Quote includes return-trip routing and a 12-hour pickup window — let us know if you need to adjust.",
        }
      : undefined,
    delivery: {
      buyer: "Acme Company 2",
      contact: "Will Smith",
      phone: "012345678910",
      email: "example@mail.com",
      location: "2012 Rue Beauregard, STE 202, Lafayette, LA 70508",
    },
    documents: [
      { name: "Example Invoice data name.pdf" },
      { name: "Example Carbon certificate data name.pdf" },
    ],
    activity: [
      { label: "Order placed", date: "Oct 29, 2024 10:10 AM", complete: true },
      {
        label: "Seller sent shipping quote",
        date: "Oct 29, 2024 10:10 AM",
        complete: true,
      },
      { label: "Quote approved", complete: false },
      { label: "Escrow funded", complete: false },
      { label: "Seller prepared shipment", complete: false },
      { label: "BOL uploaded", complete: false },
      { label: "Shipment in transit", complete: false },
      { label: "Delivery confirmed", complete: false },
      { label: "Escrow released", complete: false },
      { label: "Order completed", complete: false },
    ],
    summary: {
      productCount: 1,
      itemSubtotal: "$600.00",
      shipping: isQuoteAwaiting ? "Quote" : "$200.00",
      fees: "$2.00",
      total: isQuoteAwaiting ? "$600.00" : "$802.00",
    },
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

interface Order {
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

const ORDER_PRODUCT_IMAGES: Record<string, string> = {
  "Wood Sawdust Industrial High Quality":
    "/products/generated/wood-sawdust-industrial-high-quality.png",
  "Oat Hull Animal Grade": "/products/generated/oat-hull-animal-grade.png",
  "Soybean Meal Animal Grade": "/products/generated/soybean-meal-animal-grade.png",
  "Corn Gluten Feed": "/products/generated/corn-gluten-feed.png",
  "Beet Pulp Pellets": "/products/generated/beet-pulp-pellets.png",
  "Rice Bran Animal Grade": "/products/generated/rice-bran-animal-grade.png",
  "Wheat Middlings": "/products/generated/wheat-middlings.png",
  "Barley Grain": "/products/generated/barley-grain.png",
  "Alfalfa Hay": "/products/generated/alfalfa-hay.png",
  "Sunflower Seeds": "/products/generated/sunflower-seeds.png",
  "Fish Meal Animal Grade": "/products/generated/fish-meal-animal-grade.png",
};

const orders: Order[] = [
  {
    id: "1",
    orderId: "OD20411",
    orderPlaced: "Oct 24, 2024",
    shipping: "Delivery",
    qty: "20 tons",
    total: "$3,000.00",
    status: "Quote awaiting approval",
    category: "Wood",
    seller: "Acme company INC",
    product: "Wood Sawdust Industrial High Quality",
    productImage: ORDER_PRODUCT_IMAGES["Wood Sawdust Industrial High Quality"],
    productPrice: "$150.00",
  },
  {
    id: "2",
    orderId: "OD20412",
    orderPlaced: "Oct 24, 2024",
    shipping: "Pickup",
    qty: "20 tons",
    total: "$3,000.00",
    status: "Ready for pickup",
    category: "Wood",
    seller: "Acme company INC",
    product: "Wood Sawdust Industrial High Quality",
    productImage: ORDER_PRODUCT_IMAGES["Wood Sawdust Industrial High Quality"],
    productPrice: "$150.00",
  },
  {
    id: "2b",
    orderId: "OD20414",
    orderPlaced: "Oct 24, 2024",
    shipping: "Delivery",
    qty: "20 tons",
    total: "$3,000.00",
    status: "Awaiting payment",
    category: "Wood",
    seller: "Shell Refinery Louisiana",
    product: "Wood Sawdust Industrial High Quality",
    productImage: ORDER_PRODUCT_IMAGES["Wood Sawdust Industrial High Quality"],
    productPrice: "$150.00",
  },
  {
    id: "2c",
    orderId: "OD20415",
    orderPlaced: "Oct 24, 2024",
    shipping: "Delivery",
    qty: "20 tons",
    total: "$3,000.00",
    status: "Buyer verification",
    category: "Wood",
    seller: "Shell Refinery Louisiana",
    product: "Wood Sawdust Industrial High Quality",
    productImage: ORDER_PRODUCT_IMAGES["Wood Sawdust Industrial High Quality"],
    productPrice: "$150.00",
  },
  {
    id: "3",
    orderId: "OD20413",
    orderPlaced: "Oct 18, 2024",
    shipping: "Pickup",
    qty: "20 tons",
    total: "$3,000.00",
    status: "Completed",
    category: "Wood",
    seller: "Acme company INC",
    product: "Wood Sawdust Industrial High Quality",
    productImage: ORDER_PRODUCT_IMAGES["Wood Sawdust Industrial High Quality"],
    productPrice: "$150.00",
  },
  {
    id: "4",
    orderId: "TS98765",
    orderPlaced: "01/05/2027",
    shipping: "Delivery",
    qty: "123 lb",
    total: "$3,000.00",
    status: "Completed",
    category: "Plant",
    seller: "Golden Grain Farms",
    product: "Oat Hull Animal Grade",
    productImage: ORDER_PRODUCT_IMAGES["Oat Hull Animal Grade"],
    productPrice: "$24.00",
  },
  {
    id: "5",
    orderId: "TS98766",
    orderPlaced: "02/15/2027",
    shipping: "Pickup",
    qty: "50 lb",
    total: "$1,500.00",
    status: "Completed",
    category: "Plant",
    seller: "Evergreen AgroTech",
    product: "Soybean Meal Animal Grade",
    productImage: ORDER_PRODUCT_IMAGES["Soybean Meal Animal Grade"],
    productPrice: "$30.00",
  },
  {
    id: "6",
    orderId: "TS98767",
    orderPlaced: "03/10/2027",
    shipping: "Delivery",
    qty: "200 lb",
    total: "$2,200.00",
    status: "Completed",
    category: "Plant",
    seller: "CropPlus Solutions",
    product: "Corn Gluten Feed",
    productImage: ORDER_PRODUCT_IMAGES["Corn Gluten Feed"],
    productPrice: "$11.00",
  },
  {
    id: "7",
    orderId: "TS98768",
    orderPlaced: "04/01/2027",
    shipping: "Pickup",
    qty: "100 lb",
    total: "$1,800.00",
    status: "Completed",
    category: "Plant",
    seller: "TerraFarms Inc.",
    product: "Beet Pulp Pellets",
    productImage: ORDER_PRODUCT_IMAGES["Beet Pulp Pellets"],
    productPrice: "$18.00",
  },
  {
    id: "8",
    orderId: "TS98769",
    orderPlaced: "01/20/2027",
    shipping: "Delivery",
    qty: "150 lb",
    total: "$2,700.00",
    status: "Completed",
    category: "Plant",
    seller: "Verdant Fields Co.",
    product: "Rice Bran Animal Grade",
    productImage: ORDER_PRODUCT_IMAGES["Rice Bran Animal Grade"],
    productPrice: "$18.00",
  },
  {
    id: "9",
    orderId: "TS98770",
    orderPlaced: "02/25/2027",
    shipping: "Delivery",
    qty: "500 lb",
    total: "$1,200.00",
    status: "Completed",
    category: "Plant",
    seller: "FutureFarms Co.",
    product: "Wheat Middlings",
    productImage: ORDER_PRODUCT_IMAGES["Wheat Middlings"],
    productPrice: "$2.40",
  },
  {
    id: "10",
    orderId: "TS98771",
    orderPlaced: "03/15/2027",
    shipping: "Delivery",
    qty: "300 lb",
    total: "$2,600.00",
    status: "Completed",
    category: "Plant",
    seller: "GlobalGrains Inc.",
    product: "Barley Grain",
    productImage: ORDER_PRODUCT_IMAGES["Barley Grain"],
    productPrice: "$8.66",
  },
  {
    id: "11",
    orderId: "TS98772",
    orderPlaced: "04/05/2027",
    shipping: "Delivery",
    qty: "250 lb",
    total: "$3,200.00",
    status: "Completed",
    category: "Plant",
    seller: "AgriNova Systems",
    product: "Alfalfa Hay",
    productImage: ORDER_PRODUCT_IMAGES["Alfalfa Hay"],
    productPrice: "$12.80",
  },
  {
    id: "12",
    orderId: "TS98773",
    orderPlaced: "01/30/2027",
    shipping: "Delivery",
    qty: "400 lb",
    total: "$2,900.00",
    status: "Completed",
    category: "Plant",
    seller: "ClearWater Solutions",
    product: "Sunflower Seeds",
    productImage: ORDER_PRODUCT_IMAGES["Sunflower Seeds"],
    productPrice: "$7.25",
  },
  {
    id: "13",
    orderId: "TS98775",
    orderPlaced: "03/18/2027",
    shipping: "Delivery",
    qty: "60 lb",
    total: "$3,500.00",
    status: "Completed",
    category: "Plant",
    seller: "Solaris Farms Ltd.",
    product: "Fish Meal Animal Grade",
    productImage: ORDER_PRODUCT_IMAGES["Fish Meal Animal Grade"],
    productPrice: "$58.30",
  },
];

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
    summary: "Quote approved — escrow funding is required next.",
    nextStep: "Open Payment Method to fund the escrow.",
  },
  "Ready for pickup": {
    summary: "The seller has marked your order ready.",
    nextStep: "Schedule pickup and bring the pickup code shown on the order.",
  },
  "Buyer verification": {
    summary: "Your shipment has arrived.",
    nextStep: "Confirm delivery to release the escrow, or report an issue.",
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
    summary: "Order fulfilled and escrow released.",
    nextStep: "Nothing more to do — keep documents for your records.",
  },
  Cancelled: {
    summary: "This order was cancelled.",
    nextStep: "If escrow had been funded it has been refunded.",
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
  const canCancel =
    order.status !== "Completed" && order.status !== "Cancelled";

  const items: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
  }[] = [
    { label: "View details", icon: FileText, onClick: onViewDetails },
    { label: "Track order", icon: Truck, onClick: onViewDetails },
    { label: "Contact seller", icon: MessageCircle, onClick: () => {} },
    { label: "Download receipt", icon: FileText, onClick: () => {} },
    {
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
  onOpen,
  onCancel,
}: {
  order: Order;
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
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-4">
        <div className="flex w-full items-center gap-2 text-sm font-bold text-neutral-900">
          <Store className="size-4" />
          {order.seller}
        </div>
        <div className="flex flex-1 items-center gap-4">
          <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
            <img src={order.productImage} alt="" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-base font-bold text-neutral-900">{order.product}</p>
            <p className="text-sm text-neutral-500">
              {order.productPrice} <span className="text-neutral-400">/tons</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showReviewQuote && (
            <Button variant="primary" size="md" onClick={onOpen}>
              Review Quote
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={onOpen}>
            Order Details
          </Button>
          <MoreMenu order={order} onViewDetails={onOpen} onCancel={onCancel} />
        </div>
      </div>
    </div>
  );
}

function CompletedTable({ items }: { items: Order[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      <table className="w-full">
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
                <button className="text-neutral-400 hover:text-neutral-700">
                  <MoreHorizontal className="size-4" />
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
  const [orderList, setOrderList] = useState<Order[]>(orders);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleCancel = (id: string) => {
    setConfirmCancelId(id);
  };

  const confirmCancel = () => {
    if (!confirmCancelId) return;
    setOrderList((prev) =>
      prev.map((o) =>
        o.id === confirmCancelId ? { ...o, status: "Cancelled" } : o,
      ),
    );
    setConfirmCancelId(null);
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
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-6">
          <h1 className="text-2xl font-bold text-neutral-900">My Orders</h1>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <Search className="size-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Seach"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-40 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center gap-8 px-8"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-4 text-sm font-medium transition-colors ${
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
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {tab === "Completed" || tab === "Cancelled" ? (
            <CompletedTable items={filtered} />
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
        order={
          selectedOrderId
            ? buildOrderDetail(orderList.find((o) => o.id === selectedOrderId)!)
            : null
        }
        onClose={() => setSelectedOrderId(null)}
      />

      {confirmCancelId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-neutral-900">
              Cancel this order?
            </h2>
            <p className="mt-3 text-sm text-neutral-700">
              The seller will be notified. If escrow has been funded it will be
              refunded. This action cannot be undone.
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
