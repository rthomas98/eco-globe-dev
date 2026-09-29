"use client";

import { LiveSalesReport } from "@/components/reports/live-reports";

/** Admin sales: every order recorded on the platform. */
export function SalesPage() {
  return <LiveSalesReport scope={{ kind: "admin" }} title="Sales" rowHref={(order) => `/admin/sales/EG-${order.id}`} />;
}
