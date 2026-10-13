import { PDFDocument, StandardFonts } from "pdf-lib";

export type InvoiceOrder = {
  id: number;
  buyerCompanyName: string;
  sellerCompanyName: string;
  listingTitle: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  createdAt: Date | string;
  quotedUnitPrice: number | null;
  totalAmount: number;
  currencyCode: string;
  orderStatusCode: string;
};
export type InvoicePayment = {
  id: number;
  amount: number;
  currencyCode: string;
  paymentStatusCode: string;
  paymentTypeCode: string;
};

/** An order invoice is a statement of saved facts, never a paid receipt. */
export async function orderInvoicePdf(
  order: InvoiceOrder,
  payments: InvoicePayment[],
  shipments: { id: number; status: string }[] = [],
) {
  if (
    !Number.isFinite(Number(order.totalAmount)) ||
    !/^[A-Z]{3}$/.test(order.currencyCode)
  )
    throw new Error("Saved order money cannot be formatted as an invoice.");
  const pdf = await PDFDocument.create();
  pdf.setTitle(`EcoGlobe Invoice EG-${order.id}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]),
    y = 792;
  const write = (value: string, heading = false) => {
    const safe = value.replace(/[^\x20-\x7E]/g, "?");
    const face = heading ? bold : font,
      size = heading ? 18 : 11;
    let line = "";
    const flush = () => {
      if (y < 60) {
        page = pdf.addPage([595, 842]);
        y = 792;
      }
      page.drawText(line, { x: 45, y, size, font: face });
      y -= heading ? 30 : 20;
      line = "";
    };
    for (const character of safe) {
      if (face.widthOfTextAtSize(line + character, size) > 505 && line) flush();
      line += character;
    }
    flush();
  };
  write("EcoGlobe", true);
  write(`Invoice EG-${order.id}`, true);
  write(`Buyer: ${order.buyerCompanyName}`);
  write(`Seller: ${order.sellerCompanyName}`);
  write(`Material: ${order.listingTitle?.trim() || "Not recorded"}`);
  write(
    `Quantity: ${order.quantity === null || order.quantityUnit === null ? "Not recorded" : `${order.quantity} ${order.quantityUnit}`}`,
  );
  write(
    `Order total: ${order.currencyCode} ${Number(order.totalAmount).toFixed(2)}`,
  );
  write(`Order date: ${new Date(order.createdAt).toISOString()}`);
  write(
    `Quoted unit price: ${order.quotedUnitPrice === null || order.quotedUnitPrice === undefined ? "Not recorded" : `${order.currencyCode} ${Number(order.quotedUnitPrice).toFixed(2)}`}`,
  );
  write(`Order status: ${order.orderStatusCode}`);
  if (!shipments.length) write("No shipment recorded");
  for (const shipment of shipments)
    write(`Shipment SHP-${shipment.id} status: ${shipment.status}`);
  write("Payment records", true);
  if (!payments.length) write("No payment recorded");
  for (const payment of payments) {
    if (
      !Number.isFinite(Number(payment.amount)) ||
      !/^[A-Z]{3}$/.test(payment.currencyCode)
    )
      throw new Error("Saved payment money cannot be formatted as an invoice.");
    write(
      `TX-${payment.id}: ${payment.currencyCode} ${Number(payment.amount).toFixed(2)}; status: ${payment.paymentStatusCode}; type: ${payment.paymentTypeCode}`,
    );
  }
  write("Order status does not establish payment or settlement.");
  write("This invoice is not a paid receipt or proof of seller payout.");
  write(
    "Unsupported characters, if any, are marked with ?. See the app for original text.",
  );
  return pdf.save();
}
