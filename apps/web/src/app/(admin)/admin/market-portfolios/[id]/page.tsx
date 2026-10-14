import { MarketPortfolioDetailPage } from "@/components/admin/market-portfolios/market-portfolio-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MarketPortfolioDetailPage id={id} />;
}
