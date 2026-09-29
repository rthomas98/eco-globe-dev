"use client";

import { useDemoUser } from "@/lib/demo-user";
import { LoadingState } from "@/components/shared/data-state";
import {
  LiveCarbonReport,
  LiveProductsReport,
  LiveSalesReport,
  type ReportScope,
} from "@/components/reports/live-reports";
import { SellerLayout } from "./seller-layout";

/** Seller reports cover only the active seller company's records. */
function SellerReport({ title, render }: { title: string; render: (scope: ReportScope) => React.ReactNode }) {
  const user = useDemoUser();
  return (
    <SellerLayout title={title}>
      {user?.activeCompanyId ? (
        render({ kind: "seller", companyId: user.activeCompanyId })
      ) : user ? (
        <p className="px-6 py-12 text-center text-sm text-neutral-500">
          Select a seller company to see its reports.
        </p>
      ) : (
        <LoadingState />
      )}
    </SellerLayout>
  );
}

export function SellerSalesReportPage() {
  return <SellerReport title="Sales Reports" render={(scope) => <LiveSalesReport scope={scope} />} />;
}

export function SellerProductsReportPage() {
  return <SellerReport title="Product Performance" render={(scope) => <LiveProductsReport scope={scope} />} />;
}

export function SellerCarbonReportPage() {
  return <SellerReport title="Carbon Reports" render={(scope) => <LiveCarbonReport scope={scope} title="Carbon Reports" />} />;
}
