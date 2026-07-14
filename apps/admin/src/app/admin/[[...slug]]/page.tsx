import { notFound, redirect } from "next/navigation";
import { AccountPage } from "@/components/admin/account-page";
import { AdminAuditPage } from "@/components/admin/audit-page";
import { AdminBuyerDetailPage } from "@/components/admin/buyer-detail-page";
import { AdminBuyersPage } from "@/components/admin/buyers-page";
import { AdminContractsPage } from "@/components/admin/contracts-page";
import { AdminDisputesPage } from "@/components/admin/disputes-page";
import { AdminESignaturesPage } from "@/components/admin/e-signatures-page";
import { AdminEscrowDetailPage } from "@/components/admin/escrow-detail-page";
import { EscrowPage } from "@/components/admin/escrow-page";
import { AdminKycPage } from "@/components/admin/kyc-page";
import { AdminLogisticsPage } from "@/components/admin/logistics-page";
import { AdminListingDetailPage } from "@/components/admin/listing-detail-page";
import { AdminListingsPage } from "@/components/admin/listings-page";
import { AdminModerationPage } from "@/components/admin/moderation-page";
import { AdminNotificationsPage } from "@/components/admin/notifications-page";
import {
  CarbonReportPage,
  EscrowReportPage,
  ProductsReportPage,
  SalesReportPage,
} from "@/components/admin/reports-pages";
import { AdminSaleDetailPage } from "@/components/admin/sale-detail-page";
import { SalesPage } from "@/components/admin/sales-page";
import { AdminSellerDetailPage } from "@/components/admin/seller-detail-page";
import { AdminSellersPage } from "@/components/admin/sellers-page";
import { SettingsLayout } from "@/components/admin/settings-layout";
import {
  BuyerSettingsPage,
  CategoriesPage,
  EscrowSettingsPage,
  PaymentSettingsPage,
  SellerSettingsPage,
  TransactionRulesPage,
} from "@/components/admin/settings-pages";
import { NotificationsPreferencesPage } from "@/components/admin/notifications-preferences-page";
import { SettingsRolesPage } from "@/components/admin/settings-roles-page";
import { SettingsUsersPage } from "@/components/admin/settings-users-page";
import { AdminTransactionDetailPage } from "@/components/admin/transaction-detail-page";
import { TransactionsPage } from "@/components/admin/transactions-page";
import { DocumentsCenter } from "@/components/documents/documents-center";
import { PaymentsCenter } from "@/components/payments/payments-center";
import {
  AnalyticsCenter,
  AssetVerificationCenter,
  DeliveryTrackingCenter,
  MapIntelligenceCenter,
  PartnerNetworkCenter,
  RecommendationsCenter,
} from "@/components/phase-two/phase-two-centers";
import {
  BlockchainTraceabilityCenter,
  LanguageReadinessCenter,
  MobileAccessPreviewCenter,
  NationalExpansionCenter,
  SmartContractAutomationCenter,
} from "@/components/phase-three/phase-three-centers";
import { VideoDemoCenter } from "@/components/video-demo/video-demo-center";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

function renderSettings(path: string[]) {
  const route = path.join("/");
  const page =
    route === "" || route === "system" ? (
      redirect("/admin/settings/system/users")
    ) : route === "system/users" ? (
      <SettingsUsersPage />
    ) : route === "system/roles" ? (
      <SettingsRolesPage />
    ) : route === "buyer" ? (
      <BuyerSettingsPage />
    ) : route === "seller" ? (
      <SellerSettingsPage />
    ) : route === "categories" ? (
      <CategoriesPage />
    ) : route === "escrow" ? (
      <EscrowSettingsPage />
    ) : route === "payments" ? (
      <PaymentSettingsPage />
    ) : route === "transactions-rule" ? (
      <TransactionRulesPage />
    ) : route === "notifications" ? (
      <NotificationsPreferencesPage />
    ) : null;

  if (!page) notFound();
  return <SettingsLayout>{page}</SettingsLayout>;
}

export default async function Page({ params }: PageProps) {
  const { slug = [] } = await params;
  const [section, second, third] = slug;

  if (!section || section === "dashboard") redirect("/admin/sales");

  if (section === "settings") return renderSettings(slug.slice(1));

  if (section === "sales") {
    return second ? <AdminSaleDetailPage id={second} /> : <SalesPage />;
  }

  if (section === "listings") {
    return second ? <AdminListingDetailPage id={second} /> : <AdminListingsPage />;
  }

  if (section === "sellers") {
    return second ? <AdminSellerDetailPage id={second} /> : <AdminSellersPage />;
  }

  if (section === "buyers") {
    return second ? <AdminBuyerDetailPage id={second} /> : <AdminBuyersPage />;
  }

  if (section === "logistics") return <AdminLogisticsPage />;
  if (section === "contracts") return <AdminContractsPage />;
  if (section === "e-signatures") return <AdminESignaturesPage />;
  if (section === "documents") return <DocumentsCenter role="admin" />;
  if (section === "video-demos") return <VideoDemoCenter role="admin" />;
  if (section === "delivery-tracking") return <DeliveryTrackingCenter role="admin" />;
  if (section === "partners") return <PartnerNetworkCenter role="admin" />;
  if (section === "asset-verification") return <AssetVerificationCenter role="admin" />;
  if (section === "map-intelligence") return <MapIntelligenceCenter role="admin" />;
  if (section === "analytics") return <AnalyticsCenter role="admin" />;
  if (section === "recommendations") return <RecommendationsCenter role="admin" />;
  if (section === "blockchain-traceability") return <BlockchainTraceabilityCenter role="admin" />;
  if (section === "smart-contracts") return <SmartContractAutomationCenter role="admin" />;
  if (section === "language") return <LanguageReadinessCenter role="admin" />;
  if (section === "national-expansion") return <NationalExpansionCenter role="admin" />;
  if (section === "mobile-access") return <MobileAccessPreviewCenter role="admin" />;

  if (section === "accounting") {
    if (!second) redirect("/admin/accounting/transactions");
    if (second === "transactions") {
      return third ? <AdminTransactionDetailPage id={third} /> : <TransactionsPage />;
    }
    if (second === "escrow") {
      return third ? <AdminEscrowDetailPage id={third} /> : <EscrowPage />;
    }
    if (second === "payments") return <PaymentsCenter role="admin" />;
  }

  if (section === "reports") {
    if (!second) redirect("/admin/reports/sales");
    if (second === "sales") return <SalesReportPage />;
    if (second === "products") return <ProductsReportPage />;
    if (second === "escrow") return <EscrowReportPage />;
    if (second === "carbon") return <CarbonReportPage />;
  }

  if (section === "operations") redirect("/admin/moderation");
  if (section === "moderation") return <AdminModerationPage />;
  if (section === "kyc") return <AdminKycPage />;
  if (section === "disputes") return <AdminDisputesPage />;
  if (section === "audit") return <AdminAuditPage />;
  if (section === "notifications") return <AdminNotificationsPage />;
  if (section === "account") return <AccountPage />;

  notFound();
}
