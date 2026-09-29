import { notFound, redirect } from "next/navigation";
import { AccountPage } from "@/components/admin/account-page";
import { AdminAuditPage } from "@/components/admin/audit-page";
import { AdminBuyerDetailPage } from "@/components/admin/buyer-detail-page";
import { AdminBuyersPage } from "@/components/admin/buyers-page";
import { AdminContactRequestsPage } from "@/components/admin/contact-requests-page";
import { AdminContractsPage } from "@/components/admin/contracts-page";
import { AdminDisputesPage } from "@/components/admin/disputes-page";
import { AdminDocumentReviewPage } from "@/components/admin/document-review-page";
import { AdminESignaturesPage } from "@/components/admin/e-signatures-page";
import { AdminEscrowDetailPage } from "@/components/admin/escrow-detail-page";
import { EscrowPage } from "@/components/admin/escrow-page";
import { AdminFedexSandboxPage } from "@/components/admin/fedex-sandbox/fedex-sandbox-page";
import { AdminKycPage } from "@/components/admin/kyc-page";
import { LabPanelsPage } from "@/components/admin/lab-panels-page";
import { LabTestingQueuePage } from "@/components/admin/lab-testing-queue-page";
import { AdminListingDetailPage } from "@/components/admin/listing-detail-page";
import { AdminListingsPage } from "@/components/admin/listings-page";
import { AdminLogisticsPage } from "@/components/admin/logistics-page";
import { AdminModerationPage } from "@/components/admin/moderation-page";
import { AdminNotificationsPage } from "@/components/admin/notifications-page";
import { AdminPaymentExceptionsPage } from "@/components/admin/payment-exceptions-page";
import { NotificationsPreferencesPage } from "@/components/admin/notifications-preferences-page";
import { AdminPilotAvailabilityPage } from "@/components/admin/pilot-availability-page";
import { AdminPilotDeskPage } from "@/components/admin/pilot-desk-page";
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
import { SampleShippingDesk } from "@/components/samples/sample-shipping-desk";
import { VideoDemoCenter } from "@/components/video-demo/video-demo-center";

// Mirrors the route tree in apps/web/src/app/(admin)/admin so the standalone
// admin deployment renders exactly the same components as the web admin portal.

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

function renderSettings(path: string[]) {
  const route = path.join("/");
  if (route === "" || route === "system") redirect("/admin/settings/system/users");

  const page =
    route === "system/users" ? (
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

function renderAccounting(second?: string, third?: string) {
  if (!second) redirect("/admin/accounting/transactions");
  if (second === "transactions") {
    return third ? (
      <AdminTransactionDetailPage id={third} />
    ) : (
      <TransactionsPage />
    );
  }
  if (second === "escrow") {
    return third ? <AdminEscrowDetailPage id={third} /> : <EscrowPage />;
  }
  if (second === "payments" && !third) return <PaymentsCenter role="admin" />;
  notFound();
}

function renderReports(second?: string) {
  if (!second) redirect("/admin/reports/sales");
  if (second === "sales") return <SalesReportPage />;
  if (second === "products") return <ProductsReportPage />;
  if (second === "escrow") return <EscrowReportPage />;
  if (second === "carbon") return <CarbonReportPage />;
  notFound();
}

export default async function Page({ params }: PageProps) {
  const { slug = [] } = await params;
  const [section, second, third] = slug;

  if (!section || section === "dashboard") redirect("/admin/sales");
  if (section === "settings") return renderSettings(slug.slice(1));
  if (section === "accounting") return renderAccounting(second, third);
  if (section === "reports") return renderReports(second);

  // Detail routes: /admin/<section>/<id>
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
  if (section === "pilots") {
    if (second === "availability") return <AdminPilotAvailabilityPage />;
    return <AdminPilotDeskPage id={second} />;
  }
  if (section === "lab-testing") {
    if (second === "panels" && !third) return <LabPanelsPage />;
    if (!second) return <LabTestingQueuePage />;
    notFound();
  }
  if (section === "contracts") return <AdminContractsPage contractId={second} />;
  if (section === "e-signatures")
    return <AdminESignaturesPage envelopeId={second} />;

  // Remaining routes have no nested segments.
  if (second) notFound();

  switch (section) {
    case "samples":
      return <SampleShippingDesk role="admin" />;
    case "logistics":
      return <AdminLogisticsPage />;
    case "delivery-tracking":
      return <DeliveryTrackingCenter role="admin" />;
    case "fedex-sandbox":
      return <AdminFedexSandboxPage />;
    case "document-review":
      return <AdminDocumentReviewPage />;
    case "documents":
      return <DocumentsCenter role="admin" />;
    case "partners":
      return <PartnerNetworkCenter role="admin" />;
    case "map-intelligence":
      return <MapIntelligenceCenter role="admin" />;
    case "mobile-access":
      return <MobileAccessPreviewCenter role="admin" />;
    case "blockchain-traceability":
      return <BlockchainTraceabilityCenter role="admin" />;
    case "smart-contracts":
      return <SmartContractAutomationCenter role="admin" />;
    case "video-demos":
      return <VideoDemoCenter role="admin" />;
    case "asset-verification":
      return <AssetVerificationCenter role="admin" />;
    case "analytics":
      return <AnalyticsCenter role="admin" />;
    case "recommendations":
      return <RecommendationsCenter role="admin" />;
    case "language":
      return <LanguageReadinessCenter role="admin" />;
    case "national-expansion":
      return <NationalExpansionCenter role="admin" />;
    case "operations":
      return redirect("/admin/moderation");
    case "moderation":
      return <AdminModerationPage />;
    case "kyc":
      return <AdminKycPage />;
    case "disputes":
      return <AdminDisputesPage />;
    case "payment-exceptions":
      return <AdminPaymentExceptionsPage />;
    case "contact-requests":
      return <AdminContactRequestsPage />;
    case "audit":
      return <AdminAuditPage />;
    case "notifications":
      return <AdminNotificationsPage />;
    case "account":
      return <AccountPage />;
  }

  notFound();
}
