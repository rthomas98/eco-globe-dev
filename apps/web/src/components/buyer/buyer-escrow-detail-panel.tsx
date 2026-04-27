"use client";

import { useEffect } from "react";
import { X, Download, Printer, Mail, AlertCircle } from "lucide-react";
import { PanelHeaderMenu, downloadTextFile } from "./panel-header-menu";
import { DocumentRow } from "./document-row";

export interface EscrowDetail {
  id: string;
  amount: string;
  status: "In Progress" | "Released";
  info: {
    amountTotal: string;
    amountHeld: string;
    fundedDate: string;
    orderId: string;
    seller: string;
    shippingType: string;
  };
  documents: { name: string }[];
  activity: { label: string; date?: string; complete: boolean }[];
}

interface Props {
  escrow: EscrowDetail | null;
  onClose: () => void;
}

const STATUS_STYLES: Record<EscrowDetail["status"], string> = {
  "In Progress": "bg-blue-100 text-blue-700",
  Released: "bg-green-100 text-green-700",
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

export function BuyerEscrowDetailPanel({ escrow, onClose }: Props) {
  useEffect(() => {
    if (!escrow) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [escrow, onClose]);

  if (!escrow) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={`Escrow ${escrow.id}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[1080px] flex-col bg-neutral-50 shadow-2xl"
      >
        <header
          className="flex items-start justify-between gap-4 bg-white px-8 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">
                Escrow ID: {escrow.id}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[escrow.status]}`}
              >
                {escrow.status}
              </span>
            </div>
            <p className="text-sm text-neutral-500">{escrow.amount}</p>
          </div>
          <div className="flex items-center gap-3">
            <PanelHeaderMenu
              items={[
                {
                  label: "Print statement",
                  icon: Printer,
                  onClick: () => window.print(),
                },
                {
                  label: "Download statement",
                  icon: Download,
                  onClick: () =>
                    downloadTextFile(
                      `${escrow.id}-statement.txt`,
                      `EcoGlobe escrow statement\nEscrow ID: ${escrow.id}\nStatus: ${escrow.status}\nAmount: ${escrow.amount}\nFunded: ${escrow.info.fundedDate}\nSeller: ${escrow.info.seller}\nOrder ID: ${escrow.info.orderId}\n`,
                    ),
                },
                {
                  label: "Contact support",
                  icon: Mail,
                  onClick: () => {
                    window.location.href = `mailto:info@ecoglobeworld.com?subject=Escrow ${escrow.id}`;
                  },
                },
                {
                  label: "Report an issue",
                  icon: AlertCircle,
                  destructive: true,
                  onClick: () => {
                    window.location.href = `mailto:info@ecoglobeworld.com?subject=Issue with escrow ${escrow.id}`;
                  },
                },
              ]}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close escrow details"
              className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex flex-col gap-5">
            <SectionCard
              title="Escrow info"
              action={
                <button
                  type="button"
                  className="text-sm font-medium text-green-700 hover:underline"
                >
                  View Order Detail
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Amount Total" value={escrow.info.amountTotal} />
                <Field label="Amount held" value={escrow.info.amountHeld} />
                <Field label="Funded date" value={escrow.info.fundedDate} />
                <Field label="Order ID" value={escrow.info.orderId} />
                <Field label="Seller" value={escrow.info.seller} />
                <Field
                  label="Shipping type"
                  value={escrow.info.shippingType}
                />
              </div>
            </SectionCard>

            <SectionCard title="Documents">
              <div className="flex flex-col gap-3">
                {escrow.documents.map((doc, i) => (
                  <DocumentRow key={`${doc.name}-${i}`} name={doc.name} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Activity Log">
              <ol className="flex flex-col">
                {escrow.activity.map((item, i) => {
                  const isLast = i === escrow.activity.length - 1;
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
