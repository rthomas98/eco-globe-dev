"use client";

import { useRouter } from "next/navigation";
import { MarketRecordShell } from "../market-records/market-record-shell";
import { MarketPortfolioForm } from "./market-portfolio-form";
import { PortfolioNotice } from "./market-portfolio-shared";

export function MarketPortfolioCreatePage() {
  const router = useRouter();
  return (
    <MarketRecordShell
      title="New portfolio"
      description="Group existing published listings, assigned companies and research records. Nothing new is created."
      backHref="/admin/market-portfolios"
      backLabel="Portfolios"
      notice={<PortfolioNotice />}
    >
      <MarketPortfolioForm
        portfolio={null}
        onSaved={(portfolio) => router.push(`/admin/market-portfolios/${portfolio.id}`)}
        onCancel={() => router.push("/admin/market-portfolios")}
      />
    </MarketRecordShell>
  );
}
