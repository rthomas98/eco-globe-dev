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
