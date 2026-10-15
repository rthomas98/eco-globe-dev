import Link from "next/link";
import { receiptDownloadPath, receiptPath } from "@/lib/payment-documents";

/**
 * Receipt actions for one saved payment on admin order and transaction pages:
 * the printable receipt page and the backend-rendered PDF. Only a captured
 * payment is called a receipt; anything else is a payment record.
 */
export function PaymentReceiptLinks({
  paymentId,
  status,
  className = "flex flex-wrap items-center gap-3 text-sm",
}: {
  paymentId: number;
  status: string;
  className?: string;
}) {
  const kind = status === "captured" ? "receipt" : "record";
  return (
    <span className={className}>
      <Link href={receiptPath("admin", paymentId)} className="font-semibold underline">
        View {kind}
      </Link>
      {/* Served from the saved payment with the order access check. No download
          attribute, so an error response is shown instead of a fake PDF. */}
      <a href={receiptDownloadPath(paymentId)} className="font-semibold underline">
        Download PDF {kind}
      </a>
    </span>
  );
}
