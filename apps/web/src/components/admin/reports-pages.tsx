"use client";

import {
  LiveCarbonReport,
  LiveEscrowReport,
  LiveProductsReport,
  LiveSalesReport,
} from "@/components/reports/live-reports";

// Admin reports read every company's records (the backend scopes by session).

export function SalesReportPage() {
  return <LiveSalesReport scope={{ kind: "admin" }} />;
}

export function ProductsReportPage() {
  return <LiveProductsReport scope={{ kind: "admin" }} />;
}

export function EscrowReportPage() {
  return <LiveEscrowReport />;
}

export function CarbonReportPage() {
  return <LiveCarbonReport scope={{ kind: "admin" }} />;
}
