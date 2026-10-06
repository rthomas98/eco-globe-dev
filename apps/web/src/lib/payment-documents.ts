export interface PaymentDocument {
  id: number;
  orderId: number;
  title: string;
  payer: string;
  payee: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  reference: string | null;
  createdAt: string;
  escrowId: number | null;
}

const escapeHtml = (value: unknown) =>
  String(value ?? "Not recorded").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );

export function paymentReceiptHtml(payment: PaymentDocument): string {
  const heading =
    payment.status === "captured" ? "Payment receipt" : "Payment record";
  const fields = [
    ["Payment", `TX-${payment.id}`],
    ["Order", `EG-${payment.orderId}`],
    ["Material", payment.title],
    ["Payer", payment.payer],
    ["Seller", payment.payee],
    ["Amount", `${payment.currency} ${payment.amount.toFixed(2)}`],
    ["Status", payment.status],
    ["Payment type", payment.type],
    ["Recorded at", payment.createdAt],
    ["Provider reference", payment.reference],
    ["Escrow", payment.escrowId ? `ESC-${payment.escrowId}` : "None recorded"],
  ];
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${heading} TX-${payment.id}</title><style>body{font:16px system-ui;max-width:720px;margin:48px auto;padding:24px;color:#111}h1{font-size:28px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd;overflow-wrap:anywhere}th{width:35%}p{line-height:1.5;color:#555}@media print{body{margin:0}}</style><h1>EcoGlobe · ${heading}</h1><table>${fields.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table><p>This document reflects the recorded EcoGlobe payment status. Escrow funding is not confirmation of seller payout. Simulated transactions do not represent money moved.</p></html>`;
}

export function paymentsCsv(payments: PaymentDocument[]): string {
  const cell = (value: unknown) => {
    const text = String(value ?? "");
    // Prevent spreadsheet formulas from executing when user-controlled fields are opened.
    return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
  };
  return [
    [
      "Payment",
      "Order",
      "Material",
      "Payer",
      "Seller",
      "Amount",
      "Currency",
      "Status",
      "Type",
      "Provider reference",
      "Recorded at",
    ],
    ...payments.map((p) => [
      `TX-${p.id}`,
      `EG-${p.orderId}`,
      p.title,
      p.payer,
      p.payee,
      p.amount,
      p.currency,
      p.status,
      p.type,
      p.reference,
      p.createdAt,
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}

/** Saved payment row as returned by GET /api/payments and /api/payments/:id. */
export interface SavedPaymentRow {
  id: number;
  orderId: number;
  escrowId: number | null;
  payerCompanyName: string;
  providerPaymentId: string | null;
  amount: number | string;
  currencyCode: string;
  paymentStatusCode: string;
  paymentTypeCode: string;
  createdAt: string;
}

/** Order fields a receipt shows; null when the order could not be read. */
export interface ReceiptOrderFields {
  listingTitle: string | null;
  sellerCompanyName: string | null;
}

/**
 * Receipt document built only from the saved payment and its order. Missing
 * values stay null and print as "Not recorded".
 */
export function paymentDocumentFrom(payment: SavedPaymentRow, order: ReceiptOrderFields | null): PaymentDocument {
  return {
    id: payment.id,
    orderId: payment.orderId,
    title: order?.listingTitle ?? "Marketplace payment",
    payer: payment.payerCompanyName,
    payee: order?.sellerCompanyName ?? "Not recorded",
    amount: Number(payment.amount),
    currency: payment.currencyCode,
    status: payment.paymentStatusCode,
    type: payment.paymentTypeCode,
    reference: payment.providerPaymentId?.trim() || null,
    createdAt: payment.createdAt,
    escrowId: payment.escrowId,
  };
}

/** A paid receipt only for a captured payment; anything else is a record. */
export function receiptTitle(payment: Pick<PaymentDocument, "id" | "status">) {
  return `${payment.status === "captured" ? "Payment receipt" : "Payment record"} TX-${payment.id}`;
}

/** Printable receipt page for a role's payment centre. */
export function receiptPath(role: "buyer" | "seller" | "admin", paymentId: number) {
  return `/${role}/accounting/payments/${paymentId}`;
}
