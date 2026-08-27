"use client";

import { useEffect, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { SellerLayout } from "./seller-layout";
import {
  fetchPayments,
  portalDate,
  portalMoney,
} from "@/lib/api-portal";
import { fetchOrders } from "@/lib/api-orders";
import { readDemoUser } from "@/lib/demo-user";

interface SellerTransaction {
  id: string;
  date: string;
  orderId: string;
  buyer: string;
  product: string;
  amount: string;
  type: string;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  Completed: "bg-green-50 text-green-600",
  Processing: "bg-amber-50 text-amber-600",
  Failed: "bg-red-50 text-red-600",
  Refunded: "bg-red-50 text-red-600",
};

export function TransactionsPage() {
  const [rows, setRows] = useState<SellerTransaction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!readDemoUser()) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    Promise.all([fetchPayments(), fetchOrders()])
      .then(([payments, orders]) => {
        if (cancelled) return;
        const orderById = new Map(orders.map((order) => [order.id, order]));
        setRows(
          payments.map((payment) => {
            const order = orderById.get(payment.orderId);
            return {
              id: `TX-${payment.id}`,
              date: portalDate(payment.createdAt),
              orderId: `EG-${payment.orderId}`,
              buyer: order?.buyerCompanyName ?? payment.payerCompanyName,
              product: order?.listingTitle ?? "Marketplace order",
              amount: portalMoney(payment.amount, payment.currencyCode),
              type:
                payment.paymentTypeCode === "refund"
                  ? "Refund"
                  : payment.escrowId
                    ? "Escrow funding"
                    : "Direct payment",
              status:
                payment.paymentStatusCode === "captured"
                  ? "Completed"
                  : payment.paymentStatusCode === "refunded"
                    ? "Refunded"
                    : payment.paymentStatusCode === "failed"
                      ? "Failed"
                      : "Processing",
            };
          }),
        );
      })
      .catch(() => {
        // Empty state renders when the backend is unreachable.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = rows.filter(
    (t) =>
      !search.trim() ||
      [t.id, t.orderId, t.buyer, t.product]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <SellerLayout title="Transactions">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-neutral-900">Transactions</h1>
        <div
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2"
          style={{ border: "1px solid #F0F0F0" }}
        >
          <Search className="size-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions"
            className="w-44 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-24 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
            <Receipt className="size-6 text-neutral-500" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">
            {loaded ? "No transactions yet" : "Loading transactions..."}
          </h2>
          <p className="max-w-sm text-sm text-neutral-500">
            Your sales, payouts, and fees will appear here once orders begin
            processing.
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl bg-white"
          style={{ border: "1px solid #F0F0F0" }}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-5 py-4 font-medium">Transaction</th>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Order</th>
                <th className="px-5 py-4 font-medium">Buyer</th>
                <th className="px-5 py-4 font-medium">Product</th>
                <th className="px-5 py-4 font-medium">Amount</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-neutral-100 text-neutral-700"
                >
                  <td className="px-5 py-4 font-semibold text-neutral-900">
                    {t.id}
                  </td>
                  <td className="px-5 py-4">{t.date}</td>
                  <td className="px-5 py-4">{t.orderId}</td>
                  <td className="px-5 py-4">{t.buyer}</td>
                  <td className="px-5 py-4">{t.product}</td>
                  <td className="px-5 py-4 font-semibold text-neutral-900">
                    {t.amount}
                  </td>
                  <td className="px-5 py-4">{t.type}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        STATUS_STYLES[t.status] ?? "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerLayout>
  );
}
