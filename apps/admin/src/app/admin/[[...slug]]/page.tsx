import { notFound, redirect } from "next/navigation";
import { AccountPage } from "@/components/admin/account-page";
import { AdminBuyerDetailPage } from "@/components/admin/buyer-detail-page";
import { AdminBuyersPage } from "@/components/admin/buyers-page";
import { AdminContractsPage } from "@/components/admin/contracts-page";
import { AdminESignaturesPage } from "@/components/admin/e-signatures-page";
import { AdminLogisticsCommandCenter } from "@/components/logistics/admin-logistics-command-center";
import { AdminListingDetailPage } from "@/components/admin/listing-detail-page";
import { AdminListingsPage } from "@/components/admin/listings-page";
import { AdminNotificationsPage } from "@/components/admin/notifications-page";
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
import { DocumentsCenter } from "@/components/documents/documents-center";
import {
  AnalyticsCenter,
  RecommendationsCenter,
} from "@/components/phase-two/phase-two-centers";
import {
  LanguageReadinessCenter,
  NationalExpansionCenter,
} from "@/components/phase-three/phase-three-centers";
import { VideoDemoCenter } from "@/components/video-demo/video-demo-center";
import { AdminPartnerNetworkPage } from "@/components/partners/partner-network-workspace";
import { AdminDeliveryTrackingCenter } from "@/components/logistics/admin-delivery-tracking-center";
import { AdminMapIntelligenceCenter } from "@/components/logistics/admin-map-intelligence-center";
import { AdminMobileAccessCenter } from "@/components/mobile/admin-mobile-access-center";
import {
  AdminBlockchainTraceabilityCenter,
  AdminSmartContractAutomationCenter,
} from "@/components/automation/admin-traceability-automation-centers";
import {
  AdminAssetVerificationCenter,
  AdminPaymentsCenter,
  AdminTransactionsCenter,
} from "@/components/finance/admin-risk-finance-centers";
import {
  AdminCarbonReportPage,
  AdminEscrowOperationsCenter,
  AdminEscrowReportPage,
  AdminProductsReportPage,
  AdminSalesReportPage,
} from "@/components/finance/admin-finance-reporting-centers";
import {
  AdminDisputesCenter,
  AdminKycCenter,
  AdminModerationCenter,
} from "@/components/governance/admin-governance-centers";
import { AdminAuditCenter } from "@/components/governance/admin-audit-center";

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
    return second ? (
      <AdminListingDetailPage id={second} />
    ) : (
      <AdminListingsPage />
    );
  }

  if (section === "sellers") {
    return second ? (
      <AdminSellerDetailPage id={second} />
    ) : (
      <AdminSellersPage />
    );
  }

  if (section === "buyers") {
    return second ? <AdminBuyerDetailPage id={second} /> : <AdminBuyersPage />;
  }

  if (section === "logistics")
    return <AdminLogisticsCommandCenter shipmentId={second} />;
  if (section === "contracts")
    return <AdminContractsPage contractId={second} />;
  if (section === "e-signatures")
    return <AdminESignaturesPage envelopeId={second} />;
  if (section === "documents")
    return <DocumentsCenter role="admin" documentId={second} />;
  if (section === "video-demos")
    return <VideoDemoCenter role="admin" demoId={second} />;
  if (section === "delivery-tracking")
    return <AdminDeliveryTrackingCenter shipmentId={second} />;
  if (section === "partners")
    return <AdminPartnerNetworkPage partnerId={second} />;
  if (section === "asset-verification")
    return <AdminAssetVerificationCenter assetId={second} />;
  if (section === "map-intelligence")
    return <AdminMapIntelligenceCenter facilityId={second} />;
  if (section === "analytics") return <AnalyticsCenter role="admin" />;
  if (section === "recommendations")
    return <RecommendationsCenter role="admin" />;
  if (section === "blockchain-traceability")
    return <AdminBlockchainTraceabilityCenter recordId={second} />;
  if (section === "smart-contracts")
    return <AdminSmartContractAutomationCenter ruleId={second} />;
  if (section === "language") return <LanguageReadinessCenter role="admin" />;
  if (section === "national-expansion")
    return <NationalExpansionCenter role="admin" />;
  if (section === "mobile-access")
    return <AdminMobileAccessCenter releaseId={second} />;

  if (section === "accounting") {
    if (!second) redirect("/admin/accounting/transactions");
    if (second === "transactions") {
      return <AdminTransactionsCenter transactionId={third} />;
    }
    if (second === "escrow") {
      return <AdminEscrowOperationsCenter escrowId={third} />;
    }
    if (second === "payments") return <AdminPaymentsCenter paymentId={third} />;
  }

  if (section === "reports") {
    if (!second) redirect("/admin/reports/sales");
    if (second === "sales") return <AdminSalesReportPage />;
    if (second === "products") return <AdminProductsReportPage />;
    if (second === "escrow") return <AdminEscrowReportPage />;
    if (second === "carbon") return <AdminCarbonReportPage />;
  }

  if (section === "operations") redirect("/admin/moderation");
  if (section === "moderation")
    return <AdminModerationCenter caseId={second} />;
  if (section === "kyc") return <AdminKycCenter verificationId={second} />;
  if (section === "disputes") return <AdminDisputesCenter disputeId={second} />;
  if (section === "audit") return <AdminAuditCenter eventId={second} />;
  if (section === "notifications") return <AdminNotificationsPage />;
  if (section === "account") return <AccountPage />;

  notFound();
}
