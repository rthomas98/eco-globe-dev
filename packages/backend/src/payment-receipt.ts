import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ReceiptPayment = {
  id: number;
  orderId: number;
  escrowId: number | null;
  payerCompanyName: string;
  providerPaymentId: string | null;
  amount: number;
  currencyCode: string;
  paymentStatusCode: string;
  paymentTypeCode: string;
  createdAt: string | Date;
};

/** A statement of saved payment facts, never proof of seller settlement. */
export async function paymentReceiptPdf(
  payment: ReceiptPayment,
  order: { listingTitle: string | null; sellerCompanyName: string },
): Promise<Uint8Array> {
  const recorded = new Date(payment.createdAt);
  if (!Number.isFinite(Number(payment.amount)) || !/^[A-Z]{3}$/.test(payment.currencyCode) || !Number.isFinite(recorded.getTime()))
    throw new Error("The saved payment cannot be formatted as a receipt.");
  const captured = payment.paymentStatusCode === "captured";
  const title = `${captured ? "Payment receipt" : "Payment record"} TX-${payment.id}`;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`EcoGlobe ${title}`);
  pdf.setSubject(`Saved payment for order EG-${payment.orderId}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 792;
  const write = (value: string, heading = false) => {
    // Standard PDF fonts have a limited character set. Preserve every field
    // and mark unsupported glyphs instead of failing or silently dropping it.
    const safe = value.replace(/[^\x20-\x7E]/g, "?");
    const face = heading ? bold : font;
    const size = heading ? 18 : 11;
    const lines: string[] = [];
    let current = "";
    for (const character of safe) {
      if (face.widthOfTextAtSize(current + character, size) > 505 && current) {
        lines.push(current);
        current = "";
      }
      current += character;
    }
    lines.push(current);
    for (const line of lines) {
      if (y < 60) { page = pdf.addPage([595, 842]); y = 792; }
      page.drawText(line, { x: 45, y, size, font: face, color: rgb(0.12, 0.15, 0.12) });
      y -= heading ? 30 : 20;
    }
  };
  write("EcoGlobe", true);
  write(title, true);
  const rows: [string, string][] = [
    ["Order", `EG-${payment.orderId}`],
    ["Material", order.listingTitle?.trim() || "Not recorded"],
    ["Payer", payment.payerCompanyName],
    ["Seller", order.sellerCompanyName],
    ["Amount", `${payment.currencyCode} ${Number(payment.amount).toFixed(2)}`],
    ["Status", payment.paymentStatusCode],
    ["Payment type", payment.paymentTypeCode],
    ["Recorded", recorded.toISOString()],
    ["Provider reference", payment.providerPaymentId?.trim() || "Not recorded"],
    ["Escrow", payment.escrowId ? `ESC-${payment.escrowId}` : "None recorded"],
  ];
  rows.forEach(([label, value]) => write(`${label}: ${value}`));
  y -= 10;
  if (!captured) write("This payment is not recorded as captured. This is not a paid receipt.");
  write("A captured buyer payment is not a seller payout. Staff handle refunds and settlement.");
  write("Sandbox and simulated transactions do not represent real money moved.");
  write("Unsupported characters, if any, are marked with ?. See the app for original text.");
  return pdf.save();
}
