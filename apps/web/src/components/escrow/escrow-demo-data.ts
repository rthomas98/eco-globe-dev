export type EscrowLifecycleStatus =
  | "Awaiting funding"
  | "Held in escrow"
  | "Ready to release"
  | "Released"
  | "Disputed";

export type EscrowProvider =
  | "Escrow.com Sandbox"
  | "PayPal Delayed Disbursement"
  | "Stripe Connect Manual Transfer";

export interface EscrowActivity {
  label: string;
  date?: string;
  complete: boolean;
  note?: string;
}

export interface EscrowRecord {
  id: string;
  orderId: string;
  transactionId: string;
  provider: EscrowProvider;
  providerReference: string;
  buyer: string;
  seller: string;
  product: string;
  amount: number;
  amountHeld: number;
  platformFee: number;
  sellerPayout: number;
  currency: "USD";
  status: EscrowLifecycleStatus;
  fundedDate: string;
  orderDate: string;
  estimatedDelivery: string;
  releaseDate: string;
  releaseTrigger: string;
  automatedTrigger: string;
  inspectionWindow: string;
  shippingType: "Delivery" | "Pickup";
  disputeReason?: string;
  buyerNextStep: string;
  sellerNextStep: string;
  adminNextStep: string;
  documents: string[];
  activity: EscrowActivity[];
}

export const escrowRecords: EscrowRecord[] = [
  {
    id: "ESC-50021",
    orderId: "EG-50021",
    transactionId: "TX-50021",
    provider: "Escrow.com Sandbox",
    providerReference: "ECO-SBX-778221",
    buyer: "AgriCorp Solutions",
    seller: "EcoPack Co.",
    product: "Pyrolysis Pitch",
    amount: 13440,
    amountHeld: 13440,
    platformFee: 268.8,
    sellerPayout: 13171.2,
    currency: "USD",
    status: "Held in escrow",
    fundedDate: "May 18, 2026 10:15 AM",
    orderDate: "May 18, 2026",
    estimatedDelivery: "May 22, 2026",
    releaseDate: "Pending buyer confirmation",
    releaseTrigger: "Buyer confirms delivery, then 48-hour inspection window expires",
    automatedTrigger: "Release automatically after delivery confirmation + 48h if no dispute is open",
    inspectionWindow: "48 hours",
    shippingType: "Delivery",
    buyerNextStep: "Confirm delivery after the shipment arrives, or report an issue before the inspection window closes.",
    sellerNextStep: "Upload delivery proof and wait for buyer confirmation.",
    adminNextStep: "Monitor delivery proof and auto-release eligibility.",
    documents: ["Invoice EG-50021.pdf", "Bill of Lading EG-50021.pdf", "Escrow receipt ESC-50021.pdf"],
    activity: [
      { label: "Buyer funded escrow", date: "May 18, 2026 10:15 AM", complete: true },
      { label: "Provider confirmed funds are held", date: "May 18, 2026 10:17 AM", complete: true },
      { label: "Seller uploaded Bill of Lading", date: "May 18, 2026 10:20 AM", complete: true },
      { label: "Buyer confirms delivery", complete: false },
      { label: "Automatic release trigger fires", complete: false },
    ],
  },
  {
    id: "ESC-50018",
    orderId: "EG-50018",
    transactionId: "TX-50018",
    provider: "PayPal Delayed Disbursement",
    providerReference: "PP-DD-914452",
    buyer: "GreenHarvest Co.",
    seller: "GreenTex Ltd",
    product: "Scrap Polymer Blend with Impurities",
    amount: 8210,
    amountHeld: 8210,
    platformFee: 164.2,
    sellerPayout: 8045.8,
    currency: "USD",
    status: "Disputed",
    fundedDate: "May 16, 2026 02:40 PM",
    orderDate: "May 16, 2026",
    estimatedDelivery: "May 20, 2026",
    releaseDate: "On hold pending dispute review",
    releaseTrigger: "Admin resolves dispute or buyer accepts corrected delivery",
    automatedTrigger: "Paused because dispute is open",
    inspectionWindow: "72 hours",
    shippingType: "Delivery",
    disputeReason: "Buyer reported quality below agreed specification.",
    buyerNextStep: "Upload inspection photos and lab notes for the EcoGlobe review team.",
    sellerNextStep: "Respond with replacement offer, credit, or supporting quality documents.",
    adminNextStep: "Review evidence, decide partial release/refund, then close the dispute.",
    documents: ["Quality report buyer.pdf", "Seller specification sheet.pdf", "Delivery photos.zip"],
    activity: [
      { label: "Buyer funded escrow", date: "May 16, 2026 02:40 PM", complete: true },
      { label: "Delivery marked complete", date: "May 20, 2026 09:10 AM", complete: true },
      { label: "Buyer opened dispute", date: "May 20, 2026 04:32 PM", complete: true },
      { label: "Admin review in progress", complete: false },
      { label: "Funds released or refunded", complete: false },
    ],
  },
  {
    id: "ESC-50012",
    orderId: "EG-50012",
    transactionId: "TX-50012",
    provider: "Stripe Connect Manual Transfer",
    providerReference: "STR-MT-330118",
    buyer: "NutriFeed Industries",
    seller: "EcoPack Co.",
    product: "Harvested and Baled Corn Stover",
    amount: 4990,
    amountHeld: 0,
    platformFee: 99.8,
    sellerPayout: 4890.2,
    currency: "USD",
    status: "Released",
    fundedDate: "May 10, 2026 11:05 AM",
    orderDate: "May 10, 2026",
    estimatedDelivery: "May 13, 2026",
    releaseDate: "May 15, 2026 01:00 PM",
    releaseTrigger: "Buyer confirmed delivery and no dispute was filed inside 48 hours",
    automatedTrigger: "Completed",
    inspectionWindow: "48 hours",
    shippingType: "Pickup",
    buyerNextStep: "No action needed. Escrow has been released.",
    sellerNextStep: "Payout is complete. Statement is ready for download.",
    adminNextStep: "No action needed unless reconciliation flags a mismatch.",
    documents: ["Invoice EG-50012.pdf", "Pickup confirmation.pdf", "Seller payout receipt.pdf"],
    activity: [
      { label: "Buyer funded escrow", date: "May 10, 2026 11:05 AM", complete: true },
      { label: "Pickup confirmed", date: "May 13, 2026 04:15 PM", complete: true },
      { label: "Buyer confirmed delivery", date: "May 13, 2026 04:50 PM", complete: true },
      { label: "48-hour inspection window closed", date: "May 15, 2026 12:50 PM", complete: true },
      { label: "Funds released to seller", date: "May 15, 2026 01:00 PM", complete: true },
    ],
  },
  {
    id: "ESC-50009",
    orderId: "EG-50009",
    transactionId: "TX-50009",
    provider: "Escrow.com Sandbox",
    providerReference: "ECO-SBX-778034",
    buyer: "BioGreen Innovations",
    seller: "Trinity Feedstocks",
    product: "Black Gypsum",
    amount: 2180,
    amountHeld: 2180,
    platformFee: 43.6,
    sellerPayout: 2136.4,
    currency: "USD",
    status: "Ready to release",
    fundedDate: "May 19, 2026 08:25 AM",
    orderDate: "May 19, 2026",
    estimatedDelivery: "May 21, 2026",
    releaseDate: "May 23, 2026 11:30 AM",
    releaseTrigger: "Delivery confirmed; inspection window is currently open",
    automatedTrigger: "Scheduled for May 23, 2026 11:30 AM if no issue is reported",
    inspectionWindow: "48 hours",
    shippingType: "Delivery",
    buyerNextStep: "Report an issue before May 23 at 11:30 AM, or let the scheduled release proceed.",
    sellerNextStep: "No action needed. Payout is scheduled unless the buyer disputes delivery.",
    adminNextStep: "Allow scheduled release unless a buyer dispute arrives.",
    documents: ["Invoice EG-50009.pdf", "Proof of delivery.pdf", "Escrow receipt ESC-50009.pdf"],
    activity: [
      { label: "Buyer funded escrow", date: "May 19, 2026 08:25 AM", complete: true },
      { label: "Delivery confirmed by carrier", date: "May 21, 2026 11:00 AM", complete: true },
      { label: "Buyer confirmed delivery", date: "May 21, 2026 11:30 AM", complete: true },
      { label: "Inspection window closes", complete: false },
      { label: "Automatic release trigger fires", complete: false },
    ],
  },
];

export function formatEscrowMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getEscrowRecord(id: string) {
  return escrowRecords.find((record) => record.id === id) ?? escrowRecords[0];
}

export function escrowStatusForBuyer(status: EscrowLifecycleStatus) {
  if (status === "Released") return "Released";
  if (status === "Disputed") return "Disputed";
  if (status === "Ready to release") return "Ready to release";
  return "In escrow";
}

export function escrowStatusForSeller(status: EscrowLifecycleStatus) {
  if (status === "Released") return "Released";
  if (status === "Disputed") return "Disputed";
  if (status === "Ready to release") return "Pending payout";
  if (status === "Awaiting funding") return "Awaiting funding";
  return "Funded";
}

export function escrowStatusForAdmin(status: EscrowLifecycleStatus) {
  if (status === "Released") return "Completed";
  if (status === "Disputed") return "Disputed";
  if (status === "Ready to release") return "Ready to release";
  return "In Progress";
}
