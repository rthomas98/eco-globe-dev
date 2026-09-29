"use client";

import { useDemoUser } from "@/lib/demo-user";
import { LoadingState } from "@/components/shared/data-state";
import { CompanyDetails } from "../seller/company-page";
import { BuyerLayout } from "./buyer-layout";

/** The active buyer company as recorded by the backend. */
export function BuyerCompanyPage() {
  const user = useDemoUser();
  const companyId = user?.activeCompanyId;
  return (
    <BuyerLayout>
      <div className="h-full overflow-y-auto bg-neutral-50 px-4 py-6 sm:px-8">
        {companyId ? (
          <CompanyDetails companyId={companyId} portal="buyer" />
        ) : user ? (
          <p className="py-12 text-center text-sm text-neutral-500">Select a company to see its details.</p>
        ) : (
          <LoadingState />
        )}
      </div>
    </BuyerLayout>
  );
}
