"use client";

import { useEffect, useState } from "react";
import { Button } from "@eco-globe/ui";
import {
  adminUpdateEscrow,
  fetchBuyerProfiles,
  fetchCompany,
  fetchEscrowById,
  fetchListingById,
  fetchOrderById,
  fetchPaymentById,
  fetchSellerProfiles,
  moderateListing,
  portalDate,
  portalMoney,
  setCompanyVerification,
  trailingNumericId,
} from "@/lib/api-portal";

function CardShell({
  title,
  rows,
  actions,
  notice,
}: {
  title: string;
  rows: Array<[string, string]>;
  actions?: React.ReactNode;
  notice?: string;
}) {
  return (
    <div
      className="mb-6 rounded-2xl bg-white p-6"
      style={{ border: "2px solid #16A34A" }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
            Live record
          </p>
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="text-sm font-semibold text-neutral-900">{value}</p>
          </div>
        ))}
      </div>
      {notice && (
        <p className="mt-4 rounded-lg bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
          {notice}
        </p>
      )}
    </div>
  );
}

/** Live order facts for /admin/sales/[id]. */
export function LiveOrderCard({ uiId }: { uiId: string }) {
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const id = trailingNumericId(uiId);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchOrderById(id)
      .then((next) => {
        if (!cancelled) setOrder(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!order) return null;
  return (
    <CardShell
      title={`Order EG-${order.id} — ${String(order.listingTitle ?? "Marketplace order")}`}
      rows={[
        ["Status", String(order.orderStatusCode)],
        ["Buyer", String(order.buyerCompanyName)],
        ["Seller", String(order.sellerCompanyName)],
        ["Total", portalMoney(Number(order.totalAmount), String(order.currencyCode))],
        ["Escrow required", order.escrowRequired ? "Yes" : "No"],
        ["Placed", portalDate(String(order.createdAt))],
      ]}
    />
  );
}

/** Live escrow facts + admin release/unlock for /admin/accounting/escrow/[id]. */
export function LiveEscrowCard({ uiId }: { uiId: string }) {
  const [escrow, setEscrow] = useState<Awaited<ReturnType<typeof fetchEscrowById>> | null>(null);
  const [busy, setBusy] = useState(false);
  const id = trailingNumericId(uiId);

  const reload = () => {
    if (!id) return;
    fetchEscrowById(id)
      .then(setEscrow)
      .catch(() => {});
  };

  useEffect(reload, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!escrow) return null;

  const act = async (patch: Parameters<typeof adminUpdateEscrow>[1]) => {
    if (!id || busy) return;
    setBusy(true);
    try {
      await adminUpdateEscrow(id, patch);
      reload();
    } catch {
      // Card keeps showing the current state if the backend refuses.
    }
    setBusy(false);
  };

  return (
    <CardShell
      title={`Escrow ESC-${escrow.id} on order EG-${escrow.orderId}`}
      rows={[
        ["Status", escrow.escrowStatusCode],
        ["Amount", portalMoney(Number(escrow.amount), escrow.currencyCode)],
        ["Release rule", escrow.releaseRuleCode.replace(/_/g, " ")],
        ["Dispute locked", escrow.disputeLocked ? "Yes" : "No"],
        ["Created", portalDate(escrow.createdAt)],
        ["Updated", portalDate(escrow.updatedAt)],
      ]}
      actions={
        <>
          {escrow.disputeLocked && (
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void act({ disputeLocked: false, escrowStatusCode: "release_pending" })}
            >
              Unlock dispute
            </Button>
          )}
          {["funded", "release_pending"].includes(escrow.escrowStatusCode) &&
            !escrow.disputeLocked && (
              <Button
                variant="primary"
                size="md"
                disabled={busy}
                onClick={() => void act({ escrowStatusCode: "released" })}
              >
                {busy ? "Releasing..." : "Release funds"}
              </Button>
            )}
        </>
      }
    />
  );
}

/** Live payment facts for /admin/accounting/transactions/[id]. */
export function LivePaymentCard({ uiId }: { uiId: string }) {
  const [payment, setPayment] = useState<Awaited<ReturnType<typeof fetchPaymentById>> | null>(null);
  const id = trailingNumericId(uiId);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchPaymentById(id)
      .then((next) => {
        if (!cancelled) setPayment(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!payment) return null;
  return (
    <CardShell
      title={`Payment TX-${payment.id} on order EG-${payment.orderId}`}
      rows={[
        ["Status", payment.paymentStatusCode],
        ["Type", payment.paymentTypeCode.replace(/_/g, " ")],
        ["Amount", portalMoney(Number(payment.amount), payment.currencyCode)],
        ["Payer", payment.payerCompanyName],
        ["Escrow", payment.escrowId ? `ESC-${payment.escrowId}` : "—"],
        ["Created", portalDate(payment.createdAt)],
      ]}
    />
  );
}

/** Live listing facts + moderation for /admin/listings/[id]. */
export function LiveListingCard({ uiId }: { uiId: string }) {
  const [listing, setListing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const id = trailingNumericId(uiId);

  const reload = () => {
    if (!id) return;
    fetchListingById(id)
      .then(setListing)
      .catch(() => {});
  };

  useEffect(reload, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!listing) return null;
  const status = String(listing.listingStatusCode);

  const moderate = async (decision: "approve" | "reject") => {
    if (!id || busy) return;
    setBusy(true);
    try {
      await moderateListing(id, decision);
      reload();
    } catch {
      // Card keeps showing the current state if the backend refuses.
    }
    setBusy(false);
  };

  return (
    <CardShell
      title={`Listing LS-${listing.id} — ${String(listing.title)}`}
      rows={[
        ["Status", status],
        ["Seller", String(listing.sellerCompanyName ?? "—")],
        [
          "Price",
          listing.pricePerUnit != null
            ? portalMoney(Number(listing.pricePerUnit), String(listing.currencyCode))
            : "—",
        ],
        ["Quantity", `${listing.quantity} ${listing.quantityUnit}`],
        ["Material", String(listing.materialTypeCode).replace(/_/g, " ")],
        ["Location", String(listing.locationCity ?? "—")],
      ]}
      actions={
        status === "pending_review" ? (
          <>
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void moderate("reject")}
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={busy}
              onClick={() => void moderate("approve")}
            >
              {busy ? "Working..." : "Approve & publish"}
            </Button>
          </>
        ) : undefined
      }
    />
  );
}

/** Live company facts + verify/suspend for /admin/{sellers,buyers}/[id]. */
export function LiveCompanyCard({
  uiId,
  kind,
}: {
  uiId: string;
  kind: "seller" | "buyer";
}) {
  const [company, setCompany] = useState<Awaited<ReturnType<typeof fetchCompany>> | null>(null);
  const [profileStatus, setProfileStatus] = useState<string>("—");
  const [busy, setBusy] = useState(false);
  const id = trailingNumericId(uiId);

  const reload = () => {
    if (!id) return;
    fetchCompany(id)
      .then(setCompany)
      .catch(() => {});
    (kind === "seller" ? fetchSellerProfiles() : fetchBuyerProfiles())
      .then((profiles) => {
        const match = profiles.find((p) => p.companyId === id);
        if (match) setProfileStatus(match.approvalStatusCode.replace(/_/g, " "));
      })
      .catch(() => {});
  };

  useEffect(reload, [id, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!company) return null;

  const act = async (
    status: "verified" | "suspended" | "pending_verification",
  ) => {
    if (!id || busy) return;
    setBusy(true);
    try {
      await setCompanyVerification(id, status);
      reload();
    } catch {
      // Card keeps showing the current state if the backend refuses.
    }
    setBusy(false);
  };

  return (
    <CardShell
      title={company.legalName}
      rows={[
        ["Company ID", `C-${company.id}`],
        ["Type", company.companyTypeCode],
        ["Verification", company.verificationStatusCode.replace(/_/g, " ")],
        [`${kind === "seller" ? "Seller" : "Buyer"} approval`, profileStatus],
        ["Joined", portalDate(company.createdAt)],
      ]}
      actions={
        <>
          {company.verificationStatusCode !== "suspended" ? (
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void act("suspended")}
            >
              Suspend
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void act("pending_verification")}
            >
              Reinstate
            </Button>
          )}
          {company.verificationStatusCode !== "verified" && (
            <Button
              variant="primary"
              size="md"
              disabled={busy}
              onClick={() => void act("verified")}
            >
              {busy ? "Working..." : "Verify"}
            </Button>
          )}
        </>
      }
      notice="Actions apply immediately to the live marketplace record."
    />
  );
}
