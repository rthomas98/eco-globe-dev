"use client";

import { useEffect } from "react";
import { X, Download, Printer, Mail, AlertCircle } from "lucide-react";
import { PanelHeaderMenu, downloadTextFile } from "./panel-header-menu";
import { DocumentRow } from "./document-row";

export interface TransactionDetail {
  id: string;
  amount: string;
  status: "Processing" | "Completed" | "Failed";
  order: {
    id: string;
    placedAt: string;
    seller: string;
    quantity: string;
    shipping: string;
    paymentMethod: string;
  };
  payment: {
    grossAmount: string;
    ecoglobeFee: string;
    escrowFee: string;
    netAmount: string;
    escrowFundedDate: string;
    releaseDate: string;
    bankAccount: string;
    payoutStatus: string;
  };
  documents: { name: string }[];
  activity: { label: string; date?: string; complete: boolean }[];
}

interface Props {
  transaction: TransactionDetail | null;
  onClose: () => void;
}

const STATUS_STYLES: Record<TransactionDetail["status"], string> = {
  Processing: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-bold text-neutral-900">{label}</span>
      <span className="text-sm text-neutral-700">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl bg-white p-6"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BuyerTransactionDetailPanel({ transaction, onClose }: Props) {
  useEffect(() => {
    if (!transaction) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [transaction, onClose]);

  if (!transaction) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={`Transaction ${transaction.id}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[1080px] flex-col bg-neutral-50 shadow-2xl"
      >
        <header
          className="flex items-start justify-between gap-4 bg-white px-8 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">
                Transaction ID: {transaction.id}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[transaction.status]}`}
              >
                {transaction.status}
              </span>
            </div>
            <p className="text-sm text-neutral-500">{transaction.amount}</p>
          </div>
          <div className="flex items-center gap-3">
            <PanelHeaderMenu
              items={[
                {
                  label: "Print receipt",
                  icon: Printer,
                  onClick: () => window.print(),
                },
                {
                  label: "Download receipt",
                  icon: Download,
                  onClick: () =>
                    downloadTextFile(
                      `${transaction.id}-receipt.txt`,
                      `EcoGlobe transaction receipt\nTransaction ID: ${transaction.id}\nStatus: ${transaction.status}\nAmount: ${transaction.amount}\nOrder ID: ${transaction.order.id}\nSeller: ${transaction.order.seller}\nPayment method: ${transaction.order.paymentMethod}\n`,
                    ),
                },
                {
                  label: "Contact support",
                  icon: Mail,
                  onClick: () => {
                    window.location.href = `mailto:info@ecoglobeworld.com?subject=Transaction ${transaction.id}`;
                  },
                },
                {
                  label: "Dispute transaction",
                  icon: AlertCircle,
                  destructive: true,
                  onClick: () => {
                    window.location.href = `mailto:info@ecoglobeworld.com?subject=Dispute transaction ${transaction.id}`;
                  },
                },
              ]}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close transaction details"
              className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex flex-col gap-5">
            <SectionCard
              title="Order info"
              action={
                <button
                  type="button"
                  className="text-sm font-medium text-green-700 hover:underline"
                >
                  View Detail
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Order ID" value={transaction.order.id} />
                <Field
                  label="Order Placed"
                  value={transaction.order.placedAt}
                />
                <Field label="Seller" value={transaction.order.seller} />
                <Field
                  label="Quantity"
                  value={transaction.order.quantity}
                />
                <Field label="Shipping" value={transaction.order.shipping} />
                <Field
                  label="Payment method"
                  value={transaction.order.paymentMethod}
                />
              </div>
            </SectionCard>

            <SectionCard title="Payment details">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Field
                  label="Gross amount"
                  value={transaction.payment.grossAmount}
                />
                <Field
                  label="EcoGlobe fee"
                  value={transaction.payment.ecoglobeFee}
                />
                <Field
                  label="Escrow fee"
                  value={transaction.payment.escrowFee}
                />
                <Field
                  label="Net amount"
                  value={transaction.payment.netAmount}
                />
                <Field
                  label="Escrow funded date"
                  value={transaction.payment.escrowFundedDate}
                />
                <Field
                  label="Release date"
                  value={transaction.payment.releaseDate}
                />
                <Field
                  label="Bank account"
                  value={transaction.payment.bankAccount}
                />
                <Field
                  label="Payout status"
                  value={transaction.payment.payoutStatus}
                />
              </div>
            </SectionCard>

            <SectionCard title="Documents">
              <div className="flex flex-col gap-3">
                {transaction.documents.map((doc, i) => (
                  <DocumentRow key={`${doc.name}-${i}`} name={doc.name} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Activity Log">
              <ol className="flex flex-col">
                {transaction.activity.map((item, i) => {
                  const isLast = i === transaction.activity.length - 1;
                  return (
                    <li key={item.label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                            item.complete ? "bg-green-500" : "bg-neutral-300"
                          }`}
                        />
                        {!isLast && (
                          <span
                            className={`my-1 w-px flex-1 ${
                              item.complete ? "bg-green-500" : "bg-neutral-200"
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
        </div>
      </aside>
    </>
  );
}
