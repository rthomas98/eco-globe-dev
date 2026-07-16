"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileSearch,
  Filter,
  Fingerprint,
  Gavel,
  History,
  Link2,
  PackageCheck,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

type GovernanceKind = "moderation" | "kyc" | "disputes";
type GovernanceTab = "Overview" | "Evidence" | "Checks" | "Activity";

interface GovernanceEvidence {
  name: string;
  type: string;
  state: "Verified" | "Review" | "Missing";
  owner: string;
}

interface GovernanceCheck {
  label: string;
  state: "Passed" | "Review" | "Failed";
  detail: string;
}

interface GovernanceActivity {
  title: string;
  detail: string;
  date: string;
}

interface GovernanceRecord {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  risk: "High" | "Medium" | "Low";
  submitted: string;
  owner: string;
  value: string;
  summary: string;
  nextStep: string;
  sla: string;
  category: string;
  primaryLink: { label: string; href: string };
  related: Array<{ label: string; value: string; href: string }>;
  details: Array<{ label: string; value: string }>;
  evidence: GovernanceEvidence[];
  checks: GovernanceCheck[];
  activity: GovernanceActivity[];
}

interface GovernanceDefinition {
  eyebrow: string;
  title: string;
  description: string;
  queueTitle: string;
  statuses: string[];
  records: GovernanceRecord[];
}

const MODERATION_RECORDS: GovernanceRecord[] = [
  {
    id: "MOD-24031",
    title: "Bio-based Resin Pellets",
    subtitle: "EcoPack Co. · LIST-11071",
    status: "Pending",
    risk: "Low",
    submitted: "Today, 9:14 AM",
    owner: "Marketplace Integrity",
    value: "$18,600 projected GMV",
    summary:
      "New industrial resin listing awaiting claim, document, and category review before publication.",
    nextStep:
      "Confirm the renewable content certificate and approve the listing for marketplace search.",
    sla: "2h 18m remaining",
    category: "Industrial feedstock",
    primaryLink: { label: "Open listing", href: "/admin/listings/LIST-11071" },
    related: [
      { label: "Seller", value: "EcoPack Co.", href: "/admin/sellers/S-00231" },
      {
        label: "Listing",
        value: "LIST-11071",
        href: "/admin/listings/LIST-11071",
      },
      {
        label: "Asset",
        value: "AST-24042",
        href: "/admin/asset-verification/AST-24042",
      },
    ],
    details: [
      { label: "Product category", value: "Industrial feedstock" },
      { label: "Available volume", value: "420 tons / month" },
      { label: "Origin", value: "Baton Rouge, Louisiana" },
      { label: "Claim", value: "68% renewable content" },
      { label: "Price", value: "$44 / ton" },
      { label: "Visibility", value: "Hidden pending approval" },
    ],
    evidence: [
      {
        name: "Renewable content certificate.pdf",
        type: "Sustainability claim",
        state: "Review",
        owner: "EcoPack Co.",
      },
      {
        name: "Product specification v3.pdf",
        type: "Material specification",
        state: "Verified",
        owner: "EcoPack Co.",
      },
      {
        name: "Facility origin declaration.pdf",
        type: "Origin evidence",
        state: "Verified",
        owner: "EcoPack Co.",
      },
    ],
    checks: [
      {
        label: "Restricted material screen",
        state: "Passed",
        detail: "No prohibited compounds detected.",
      },
      {
        label: "Category and taxonomy",
        state: "Passed",
        detail: "Industrial feedstock classification is appropriate.",
      },
      {
        label: "Sustainability claim",
        state: "Review",
        detail: "Certificate issuer signature needs admin confirmation.",
      },
      {
        label: "Seller eligibility",
        state: "Passed",
        detail: "Seller verification is active through May 2027.",
      },
    ],
    activity: [
      {
        title: "Listing submitted",
        detail: "EcoPack Co. requested marketplace publication.",
        date: "Today, 9:14 AM",
      },
      {
        title: "Automated content review complete",
        detail: "No prohibited language or duplicate content found.",
        date: "Today, 9:15 AM",
      },
      {
        title: "Assigned to Marketplace Integrity",
        detail: "Sustainability claim routed for admin review.",
        date: "Today, 9:18 AM",
      },
    ],
  },
  {
    id: "MOD-24030",
    title: "Recycled Aluminum Sheet",
    subtitle: "Metal Reclaim LLC · LIST-11069",
    status: "Flagged",
    risk: "High",
    submitted: "Yesterday",
    owner: "Sustainability Review",
    value: "$31,200 projected GMV",
    summary:
      "Buyer challenge opened against the listing's 92% recycled-content claim.",
    nextStep:
      "Request a revised mill certificate or remove the disputed sustainability claim.",
    sla: "46m remaining",
    category: "Recovered metal",
    primaryLink: { label: "Open listing", href: "/admin/listings/LIST-11069" },
    related: [
      {
        label: "Seller",
        value: "Metal Reclaim LLC",
        href: "/admin/sellers/S-00244",
      },
      {
        label: "Listing",
        value: "LIST-11069",
        href: "/admin/listings/LIST-11069",
      },
      {
        label: "Document",
        value: "DOC-7188",
        href: "/admin/documents/DOC-7188",
      },
    ],
    details: [
      { label: "Product category", value: "Recovered metal" },
      { label: "Available volume", value: "180 tons / month" },
      { label: "Origin", value: "Dallas, Texas" },
      { label: "Claim", value: "92% recycled content" },
      { label: "Price", value: "$173 / ton" },
      { label: "Visibility", value: "Paused after buyer flag" },
    ],
    evidence: [
      {
        name: "Mill certificate 2025.pdf",
        type: "Recycled content",
        state: "Review",
        owner: "Metal Reclaim LLC",
      },
      {
        name: "Buyer challenge notes.pdf",
        type: "Marketplace complaint",
        state: "Verified",
        owner: "Circular Assurance Group",
      },
      {
        name: "Updated mill certificate.pdf",
        type: "Replacement evidence",
        state: "Missing",
        owner: "Metal Reclaim LLC",
      },
    ],
    checks: [
      {
        label: "Restricted material screen",
        state: "Passed",
        detail: "Material is eligible for marketplace trade.",
      },
      {
        label: "Claim evidence currency",
        state: "Failed",
        detail: "Submitted mill certificate is outside the accepted period.",
      },
      {
        label: "Buyer complaint credibility",
        state: "Review",
        detail: "Challenge includes traceable transaction evidence.",
      },
      {
        label: "Seller response",
        state: "Review",
        detail: "Replacement evidence requested yesterday.",
      },
    ],
    activity: [
      {
        title: "Buyer flag received",
        detail: "Circular Assurance challenged the recycled-content claim.",
        date: "Yesterday, 2:42 PM",
      },
      {
        title: "Listing visibility paused",
        detail: "New checkout sessions were disabled automatically.",
        date: "Yesterday, 2:43 PM",
      },
      {
        title: "Seller evidence requested",
        detail: "Metal Reclaim LLC has 24 hours to respond.",
        date: "Yesterday, 3:05 PM",
      },
    ],
  },
  {
    id: "MOD-24028",
    title: "Coal Tar Carbon Black Oil",
    subtitle: "Refinery Surplus · LIST-11064",
    status: "Pending",
    risk: "Medium",
    submitted: "Jul 15, 2026",
    owner: "Materials Review",
    value: "$24,900 projected GMV",
    summary:
      "Specialty material listing requires hazard, custody, and approved-buyer controls.",
    nextStep:
      "Confirm SDS coverage and restrict search visibility to verified industrial buyers.",
    sla: "8h remaining",
    category: "Industrial byproduct",
    primaryLink: { label: "Open listing", href: "/admin/listings/LIST-11064" },
    related: [
      {
        label: "Seller",
        value: "Refinery Surplus",
        href: "/admin/sellers/S-00248",
      },
      {
        label: "Listing",
        value: "LIST-11064",
        href: "/admin/listings/LIST-11064",
      },
      {
        label: "Document",
        value: "DOC-7172",
        href: "/admin/documents/DOC-7172",
      },
    ],
    details: [
      { label: "Product category", value: "Industrial byproduct" },
      { label: "Available volume", value: "300 tons / month" },
      { label: "Origin", value: "Houston, Texas" },
      { label: "Hazard class", value: "Controlled industrial material" },
      { label: "Price", value: "$83 / ton" },
      { label: "Visibility", value: "Hidden pending approval" },
    ],
    evidence: [
      {
        name: "Safety data sheet.pdf",
        type: "Hazard evidence",
        state: "Verified",
        owner: "Refinery Surplus",
      },
      {
        name: "Custody declaration.pdf",
        type: "Chain of custody",
        state: "Review",
        owner: "Refinery Surplus",
      },
    ],
    checks: [
      {
        label: "Restricted material screen",
        state: "Review",
        detail: "Allowed only for approved industrial buyer roles.",
      },
      {
        label: "Safety data sheet",
        state: "Passed",
        detail: "Current SDS covers the submitted product.",
      },
      {
        label: "Chain of custody",
        state: "Review",
        detail: "Origin facility validation is still running.",
      },
      {
        label: "Seller eligibility",
        state: "Passed",
        detail: "Seller is verified for controlled materials.",
      },
    ],
    activity: [
      {
        title: "Listing submitted",
        detail: "Controlled material workflow started.",
        date: "Jul 15, 2026",
      },
      {
        title: "SDS verified",
        detail: "Document fields match the submitted product.",
        date: "Jul 15, 2026",
      },
    ],
  },
  {
    id: "MOD-24027",
    title: "Molecular Sieve Zeolite 13X",
    subtitle: "EcoPack Co. · LIST-11057",
    status: "Approved",
    risk: "Low",
    submitted: "Jul 14, 2026",
    owner: "Marketplace Integrity",
    value: "$12,800 active GMV",
    summary: "Listing passed product, seller, and sustainability checks.",
    nextStep: "Monitor buyer feedback and renewal evidence.",
    sla: "Completed",
    category: "Mineral feedstock",
    primaryLink: { label: "Open listing", href: "/admin/listings/LIST-11057" },
    related: [
      {
        label: "Listing",
        value: "LIST-11057",
        href: "/admin/listings/LIST-11057",
      },
    ],
    details: [{ label: "Decision", value: "Approved Jul 14, 2026" }],
    evidence: [
      {
        name: "Product specification.pdf",
        type: "Material specification",
        state: "Verified",
        owner: "EcoPack Co.",
      },
    ],
    checks: [
      {
        label: "Marketplace eligibility",
        state: "Passed",
        detail: "All required controls passed.",
      },
    ],
    activity: [
      {
        title: "Listing approved",
        detail: "Published to verified buyers.",
        date: "Jul 14, 2026",
      },
    ],
  },
];

const KYC_RECORDS: GovernanceRecord[] = [
  {
    id: "KYC-9211",
    title: "EcoPack Co.",
    subtitle: "Seller · United States",
    status: "Submitted",
    risk: "Low",
    submitted: "Today, 8:32 AM",
    owner: "Identity Operations",
    value: "4 documents",
    summary:
      "Seller renewal covering company registration, beneficial ownership, banking, and authorized representative.",
    nextStep:
      "Validate the authorized representative and approve the annual renewal.",
    sla: "3h 12m remaining",
    category: "Seller",
    primaryLink: { label: "Open seller", href: "/admin/sellers/S-00231" },
    related: [
      { label: "Seller", value: "S-00231", href: "/admin/sellers/S-00231" },
      {
        label: "Partner",
        value: "GreenLine Logistics",
        href: "/admin/partners/PRT-1001",
      },
      {
        label: "Document",
        value: "DOC-7201",
        href: "/admin/documents/DOC-7201",
      },
    ],
    details: [
      { label: "Legal name", value: "EcoPack Company LLC" },
      { label: "Registration", value: "Louisiana · 4420819" },
      { label: "Tax identifier", value: "Verified ending 8214" },
      { label: "Representative", value: "Jordan Bell · COO" },
      { label: "Beneficial owners", value: "2 declared" },
      { label: "Verification tier", value: "Marketplace seller" },
    ],
    evidence: [
      {
        name: "Louisiana registration.pdf",
        type: "Business registration",
        state: "Verified",
        owner: "EcoPack Co.",
      },
      {
        name: "Beneficial ownership statement.pdf",
        type: "Ownership",
        state: "Verified",
        owner: "EcoPack Co.",
      },
      {
        name: "Jordan Bell identity.pdf",
        type: "Representative identity",
        state: "Review",
        owner: "EcoPack Co.",
      },
      {
        name: "Bank verification letter.pdf",
        type: "Payout readiness",
        state: "Verified",
        owner: "EcoPack Co.",
      },
    ],
    checks: [
      {
        label: "Business registry",
        state: "Passed",
        detail: "Legal entity is active and in good standing.",
      },
      {
        label: "Sanctions screening",
        state: "Passed",
        detail: "No matches across entity or declared owners.",
      },
      {
        label: "Representative identity",
        state: "Review",
        detail: "Address comparison needs manual confirmation.",
      },
      {
        label: "Bank ownership",
        state: "Passed",
        detail: "Payout account name matches the legal entity.",
      },
    ],
    activity: [
      {
        title: "Renewal submitted",
        detail: "Four documents received through the seller portal.",
        date: "Today, 8:32 AM",
      },
      {
        title: "Automated screening complete",
        detail: "Registry and sanctions checks passed.",
        date: "Today, 8:34 AM",
      },
      {
        title: "Manual identity review assigned",
        detail: "Address comparison routed to Identity Operations.",
        date: "Today, 8:36 AM",
      },
    ],
  },
  {
    id: "KYC-9210",
    title: "GreenTex Ltd",
    subtitle: "Seller · United Kingdom",
    status: "In review",
    risk: "High",
    submitted: "Yesterday",
    owner: "Enhanced Due Diligence",
    value: "6 documents · 1 flag",
    summary:
      "International seller application with an ownership structure requiring enhanced review.",
    nextStep:
      "Resolve the indirect owner screening match and record a disposition.",
    sla: "1h 05m remaining",
    category: "Seller",
    primaryLink: { label: "Open seller", href: "/admin/sellers/S-00258" },
    related: [
      { label: "Seller", value: "S-00258", href: "/admin/sellers/S-00258" },
      {
        label: "Document",
        value: "DOC-7198",
        href: "/admin/documents/DOC-7198",
      },
    ],
    details: [
      { label: "Legal name", value: "GreenTex Materials Limited" },
      { label: "Registration", value: "Companies House · 12881142" },
      { label: "Representative", value: "Amelia Ward · Director" },
      { label: "Beneficial owners", value: "3 declared" },
      { label: "Risk reason", value: "Indirect owner name match" },
      { label: "Verification tier", value: "International seller" },
    ],
    evidence: [
      {
        name: "Companies House extract.pdf",
        type: "Business registration",
        state: "Verified",
        owner: "GreenTex Ltd",
      },
      {
        name: "Ownership chart.pdf",
        type: "Ownership",
        state: "Review",
        owner: "GreenTex Ltd",
      },
      {
        name: "Director passport.pdf",
        type: "Representative identity",
        state: "Verified",
        owner: "GreenTex Ltd",
      },
    ],
    checks: [
      {
        label: "Business registry",
        state: "Passed",
        detail: "Company is active.",
      },
      {
        label: "Sanctions screening",
        state: "Review",
        detail: "Possible indirect owner match needs disposition.",
      },
      {
        label: "Representative identity",
        state: "Passed",
        detail: "Identity and authority validate.",
      },
      {
        label: "Ownership completeness",
        state: "Review",
        detail: "One intermediate company needs registry proof.",
      },
    ],
    activity: [
      {
        title: "Application submitted",
        detail: "International seller review started.",
        date: "Yesterday, 10:12 AM",
      },
      {
        title: "Potential match detected",
        detail: "Indirect owner screening escalated.",
        date: "Yesterday, 10:15 AM",
      },
    ],
  },
  {
    id: "KYC-9208",
    title: "Atlas Carbon Black",
    subtitle: "Buyer · Mexico",
    status: "Awaiting docs",
    risk: "Medium",
    submitted: "Jul 14, 2026",
    owner: "Identity Operations",
    value: "2 of 4 documents",
    summary:
      "Buyer verification is waiting on tax registration and authorized representative evidence.",
    nextStep:
      "Send the outstanding document request and keep checkout disabled.",
    sla: "Waiting on applicant",
    category: "Buyer",
    primaryLink: { label: "Open buyer", href: "/admin/buyers/B-00184" },
    related: [
      { label: "Buyer", value: "B-00184", href: "/admin/buyers/B-00184" },
    ],
    details: [
      { label: "Country", value: "Mexico" },
      { label: "Verification tier", value: "Industrial buyer" },
    ],
    evidence: [
      {
        name: "Company registration.pdf",
        type: "Business registration",
        state: "Verified",
        owner: "Atlas Carbon Black",
      },
      {
        name: "Tax registration.pdf",
        type: "Tax evidence",
        state: "Missing",
        owner: "Atlas Carbon Black",
      },
    ],
    checks: [
      {
        label: "Required document coverage",
        state: "Failed",
        detail: "Two required documents are missing.",
      },
    ],
    activity: [
      {
        title: "Documents requested",
        detail: "Applicant notified through the buyer portal.",
        date: "Jul 15, 2026",
      },
    ],
  },
  {
    id: "KYC-9205",
    title: "Rotterdam Bio Refineries",
    subtitle: "Seller · Netherlands",
    status: "Approved",
    risk: "Low",
    submitted: "Jul 12, 2026",
    owner: "Identity Operations",
    value: "5 documents",
    summary:
      "International seller verification completed with no open risk flags.",
    nextStep: "Monitor annual renewal date.",
    sla: "Completed",
    category: "Seller",
    primaryLink: { label: "Open seller", href: "/admin/sellers/S-00261" },
    related: [
      { label: "Seller", value: "S-00261", href: "/admin/sellers/S-00261" },
    ],
    details: [{ label: "Decision", value: "Approved Jul 13, 2026" }],
    evidence: [
      {
        name: "KVK registration.pdf",
        type: "Business registration",
        state: "Verified",
        owner: "Rotterdam Bio Refineries",
      },
    ],
    checks: [
      {
        label: "Verification decision",
        state: "Passed",
        detail: "All required checks passed.",
      },
    ],
    activity: [
      {
        title: "Verification approved",
        detail: "Seller access enabled.",
        date: "Jul 13, 2026",
      },
    ],
  },
];

const DISPUTE_RECORDS: GovernanceRecord[] = [
  {
    id: "DSP-2041",
    title: "Quantity mismatch on delivery",
    subtitle: "AgriCorp Solutions vs. EcoPack Co. · EG-50021",
    status: "Open",
    risk: "High",
    submitted: "3 days ago",
    owner: "Resolution Operations",
    value: "$13,440 protected",
    summary:
      "Buyer reports 184 tons received against a 200-ton order. Escrow remains fully held.",
    nextStep:
      "Compare scale tickets, carrier proof, and seller release records before proposing a resolution.",
    sla: "38m remaining",
    category: "Quantity",
    primaryLink: {
      label: "Open escrow",
      href: "/admin/accounting/escrow/ESC-50021",
    },
    related: [
      {
        label: "Transaction",
        value: "TX-50021",
        href: "/admin/accounting/transactions/TX-50021",
      },
      {
        label: "Escrow",
        value: "ESC-50021",
        href: "/admin/accounting/escrow/ESC-50021",
      },
      {
        label: "Shipment",
        value: "SHP-6201",
        href: "/admin/delivery-tracking/SHP-6201",
      },
    ],
    details: [
      { label: "Order quantity", value: "200 tons" },
      { label: "Buyer measured", value: "184 tons" },
      { label: "Difference", value: "16 tons · 8%" },
      { label: "Protected value", value: "$13,440" },
      { label: "Requested outcome", value: "Partial refund" },
      { label: "Escrow state", value: "Fully held" },
    ],
    evidence: [
      {
        name: "Buyer scale ticket.pdf",
        type: "Buyer evidence",
        state: "Verified",
        owner: "AgriCorp Solutions",
      },
      {
        name: "Origin scale ticket.pdf",
        type: "Seller evidence",
        state: "Review",
        owner: "EcoPack Co.",
      },
      {
        name: "Carrier delivery proof.pdf",
        type: "Logistics evidence",
        state: "Verified",
        owner: "GreenLine Logistics",
      },
    ],
    checks: [
      {
        label: "Buyer evidence authenticity",
        state: "Passed",
        detail: "Scale ticket issuer and timestamp validate.",
      },
      {
        label: "Seller evidence comparison",
        state: "Review",
        detail: "Origin weight differs from carrier manifest by 5 tons.",
      },
      {
        label: "Escrow protection",
        state: "Passed",
        detail: "Automated release is paused.",
      },
      {
        label: "Resolution policy",
        state: "Review",
        detail: "Partial refund range is $1,075–$1,290.",
      },
    ],
    activity: [
      {
        title: "Buyer opened dispute",
        detail: "Quantity mismatch reported with scale evidence.",
        date: "Jul 13, 2026",
      },
      {
        title: "Escrow release paused",
        detail: "Full protected value remains held.",
        date: "Jul 13, 2026",
      },
      {
        title: "Seller response received",
        detail: "Origin scale ticket added to the case.",
        date: "Jul 14, 2026",
      },
    ],
  },
  {
    id: "DSP-2038",
    title: "Quality below specification",
    subtitle: "GreenHarvest Co. vs. GreenTex Ltd · EG-50018",
    status: "Under review",
    risk: "High",
    submitted: "6 days ago",
    owner: "Materials Resolution",
    value: "$8,210 protected",
    summary:
      "Delivered polymer blend exceeds the contracted impurity tolerance.",
    nextStep:
      "Review lab results and decide partial release, replacement, or refund.",
    sla: "1h 24m remaining",
    category: "Quality",
    primaryLink: {
      label: "Open escrow",
      href: "/admin/accounting/escrow/ESC-50018",
    },
    related: [
      {
        label: "Transaction",
        value: "TX-50018",
        href: "/admin/accounting/transactions/TX-50018",
      },
      {
        label: "Escrow",
        value: "ESC-50018",
        href: "/admin/accounting/escrow/ESC-50018",
      },
      {
        label: "Asset",
        value: "AST-24022",
        href: "/admin/asset-verification/AST-24022",
      },
    ],
    details: [
      { label: "Contract tolerance", value: "≤ 4% impurity" },
      { label: "Lab result", value: "7.2% impurity" },
      { label: "Protected value", value: "$8,210" },
      { label: "Requested outcome", value: "Replacement or refund" },
    ],
    evidence: [
      {
        name: "Independent lab report.pdf",
        type: "Buyer evidence",
        state: "Verified",
        owner: "GreenHarvest Co.",
      },
      {
        name: "Seller specification sheet.pdf",
        type: "Seller evidence",
        state: "Review",
        owner: "GreenTex Ltd",
      },
    ],
    checks: [
      {
        label: "Lab accreditation",
        state: "Passed",
        detail: "Testing facility credentials are current.",
      },
      {
        label: "Contract comparison",
        state: "Failed",
        detail: "Measured impurity exceeds the agreed tolerance.",
      },
      {
        label: "Seller remedy",
        state: "Review",
        detail: "Replacement offer received yesterday.",
      },
    ],
    activity: [
      {
        title: "Buyer opened dispute",
        detail: "Quality evidence uploaded.",
        date: "Jul 10, 2026",
      },
      {
        title: "Materials review started",
        detail: "Lab evidence accepted for review.",
        date: "Jul 11, 2026",
      },
    ],
  },
  {
    id: "DSP-2031",
    title: "Damaged in transit",
    subtitle: "NutriFeed Industries vs. EcoPack Co. · EG-50012",
    status: "Awaiting seller",
    risk: "Medium",
    submitted: "12 days ago",
    owner: "Resolution Operations",
    value: "$4,990 transaction",
    summary: "Buyer reports water damage after carrier delivery.",
    nextStep:
      "Wait for seller and carrier response before scoring responsibility.",
    sla: "Waiting on seller",
    category: "Delivery",
    primaryLink: {
      label: "Open shipment",
      href: "/admin/delivery-tracking/SHP-6199",
    },
    related: [
      {
        label: "Transaction",
        value: "TX-50012",
        href: "/admin/accounting/transactions/TX-50012",
      },
    ],
    details: [{ label: "Escrow state", value: "Previously released" }],
    evidence: [
      {
        name: "Delivery photos.zip",
        type: "Buyer evidence",
        state: "Review",
        owner: "NutriFeed Industries",
      },
    ],
    checks: [
      {
        label: "Seller response",
        state: "Review",
        detail: "Response due tomorrow.",
      },
    ],
    activity: [
      {
        title: "Seller response requested",
        detail: "Case remains open.",
        date: "Jul 15, 2026",
      },
    ],
  },
  {
    id: "DSP-2018",
    title: "Carbon certification missing",
    subtitle: "PurePastures Ltd. vs. EcoPack Co. · EG-50002",
    status: "Resolved",
    risk: "Low",
    submitted: "26 days ago",
    owner: "Resolution Operations",
    value: "$5,640 transaction",
    summary: "Case closed with buyer credit and seller payout adjustment.",
    nextStep: "No further action required.",
    sla: "Completed",
    category: "Documentation",
    primaryLink: {
      label: "Open transaction",
      href: "/admin/accounting/transactions/TX-50002",
    },
    related: [
      {
        label: "Transaction",
        value: "TX-50002",
        href: "/admin/accounting/transactions/TX-50002",
      },
    ],
    details: [{ label: "Resolution", value: "$280 buyer credit" }],
    evidence: [
      {
        name: "Resolution agreement.pdf",
        type: "Final decision",
        state: "Verified",
        owner: "EcoGlobe",
      },
    ],
    checks: [
      {
        label: "Resolution completion",
        state: "Passed",
        detail: "All parties were notified.",
      },
    ],
    activity: [
      {
        title: "Dispute resolved",
        detail: "Buyer credit recorded.",
        date: "Jul 8, 2026",
      },
    ],
  },
];

const GOVERNANCE: Record<GovernanceKind, GovernanceDefinition> = {
  moderation: {
    eyebrow: "Marketplace governance",
    title: "Protect catalog quality and marketplace trust",
    description:
      "Review listing claims, evidence, taxonomy, and seller eligibility before products reach buyers.",
    queueTitle: "Listing review queue",
    statuses: ["All", "Pending", "Flagged", "Approved", "Rejected"],
    records: MODERATION_RECORDS,
  },
  kyc: {
    eyebrow: "Identity governance",
    title: "Verify every marketplace participant with confidence",
    description:
      "Resolve identity, ownership, sanctions, and document checks for buyers and sellers.",
    queueTitle: "Verification queue",
    statuses: [
      "All",
      "Submitted",
      "In review",
      "Awaiting docs",
      "Approved",
      "Rejected",
    ],
    records: KYC_RECORDS,
  },
  disputes: {
    eyebrow: "Resolution governance",
    title: "Resolve marketplace disputes with protected funds and evidence",
    description:
      "Coordinate buyer, seller, carrier, asset, and escrow evidence through an auditable decision workflow.",
    queueTitle: "Dispute case queue",
    statuses: [
      "All",
      "Open",
      "Under review",
      "Awaiting seller",
      "Awaiting buyer",
      "Resolved",
    ],
    records: DISPUTE_RECORDS,
  },
};

function kindIcon(kind: GovernanceKind) {
  return kind === "moderation"
    ? PackageCheck
    : kind === "kyc"
      ? Fingerprint
      : Gavel;
}

function kindNoun(kind: GovernanceKind) {
  return kind === "moderation"
    ? "listing"
    : kind === "kyc"
      ? "verification"
      : "case";
}

function statusTone(status: string) {
  if (["Approved", "Resolved"].includes(status))
    return "bg-emerald-50 text-emerald-700";
  if (["Flagged", "Rejected", "Open"].includes(status))
    return "bg-red-50 text-red-700";
  if (
    ["Pending", "Awaiting docs", "Awaiting seller", "Awaiting buyer"].includes(
      status,
    )
  )
    return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

function riskTone(risk: GovernanceRecord["risk"]) {
  return risk === "High"
    ? "bg-red-50 text-red-700"
    : risk === "Medium"
      ? "bg-amber-50 text-amber-700"
      : "bg-neutral-100 text-neutral-600";
}

export function AdminGovernanceCenter({
  kind,
  recordId,
}: {
  kind: GovernanceKind;
  recordId?: string;
}) {
  const definition = GOVERNANCE[kind];
  const record = recordId
    ? (definition.records.find((item) => item.id === recordId) ??
      definition.records[0])
    : undefined;
  return record ? (
    <GovernanceDetail kind={kind} record={record} />
  ) : (
    <GovernanceQueue kind={kind} definition={definition} />
  );
}

function GovernanceQueue({
  kind,
  definition,
}: {
  kind: GovernanceKind;
  definition: GovernanceDefinition;
}) {
  const router = useRouter();
  const Icon = kindIcon(kind);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [risk, setRisk] = useState("All risk");
  const [notice, setNotice] = useState("");
  const visible = useMemo(
    () =>
      definition.records.filter((record) => {
        const statusMatch = status === "All" || record.status === status;
        const riskMatch = risk === "All risk" || record.risk === risk;
        const text =
          `${record.id} ${record.title} ${record.subtitle} ${record.category} ${record.owner}`.toLowerCase();
        return statusMatch && riskMatch && text.includes(query.toLowerCase());
      }),
    [definition.records, query, risk, status],
  );
  const open = definition.records.filter(
    (record) => !["Approved", "Resolved", "Rejected"].includes(record.status),
  ).length;
  const highRisk = definition.records.filter(
    (record) =>
      record.risk === "High" &&
      !["Approved", "Resolved"].includes(record.status),
  ).length;
  const evidence = definition.records.reduce(
    (sum, record) =>
      sum + record.evidence.filter((item) => item.state !== "Verified").length,
    0,
  );

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1560px] space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              <Icon className="size-4" />
              {definition.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">
              {definition.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              {definition.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Queue refreshed from the current governance review model.",
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700"
            >
              <RefreshCcw className="size-4" />
              Refresh queue
            </button>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Governance briefing prepared for the current queue filters.",
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white"
            >
              <Download className="size-4" />
              Export briefing
            </button>
          </div>
        </header>
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QueueMetric
            icon={Clock3}
            label="Open reviews"
            value={String(open)}
            detail="Requires governance action"
          />
          <QueueMetric
            icon={ShieldAlert}
            label="High risk"
            value={String(highRisk)}
            detail="Prioritized in this queue"
          />
          <QueueMetric
            icon={FileSearch}
            label="Evidence gaps"
            value={String(evidence)}
            detail="Review or missing items"
          />
          <QueueMetric
            icon={CheckCircle2}
            label="Within SLA"
            value="86%"
            detail="Across the last 30 days"
          />
        </section>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">
                  {definition.queueTitle}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {visible.length} records in the current view
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex h-10 min-w-56 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm">
                  <Search className="size-4 text-neutral-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`Search ${kindNoun(kind)}s`}
                    className="min-w-0 flex-1 bg-transparent outline-none"
                  />
                </label>
                <label className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm">
                  <Filter className="size-4 text-neutral-400" />
                  <select
                    aria-label="Governance status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="bg-transparent font-medium outline-none"
                  >
                    {definition.statuses.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <select
                  aria-label="Risk level"
                  value={risk}
                  onChange={(event) => setRisk(event.target.value)}
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium outline-none"
                >
                  <option>All risk</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-neutral-100">
              {visible.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  onClick={() => router.push(`/admin/${kind}/${record.id}`)}
                  className="grid w-full gap-4 p-5 text-left transition hover:bg-neutral-50 lg:grid-cols-[minmax(0,1fr)_170px_150px_120px_24px] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700">
                        {record.id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(record.status)}`}
                      >
                        {record.status}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${riskTone(record.risk)}`}
                      >
                        {record.risk} risk
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-sm font-bold text-neutral-950">
                      {record.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {record.subtitle}
                    </p>
                  </div>
                  <QueueField label="Owner" value={record.owner} />
                  <QueueField label="Exposure" value={record.value} />
                  <QueueField label="SLA" value={record.sla} />
                  <ChevronRight className="size-4 text-neutral-300" />
                </button>
              ))}
            </div>
            {visible.length === 0 && (
              <div className="p-10 text-center">
                <Search className="mx-auto size-7 text-neutral-300" />
                <p className="mt-3 text-sm font-semibold text-neutral-700">
                  No governance records match this view.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStatus("All");
                    setRisk("All risk");
                  }}
                  className="mt-2 text-sm font-semibold text-emerald-700"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          <GovernanceSidebar
            kind={kind}
            records={definition.records}
            onNavigate={(id) => router.push(`/admin/${kind}/${id}`)}
          />
        </section>
      </div>
    </div>
  );
}

function GovernanceSidebar({
  kind,
  records,
  onNavigate,
}: {
  kind: GovernanceKind;
  records: GovernanceRecord[];
  onNavigate: (id: string) => void;
}) {
  const urgent =
    records.find(
      (record) =>
        record.risk === "High" &&
        !["Approved", "Resolved"].includes(record.status),
    ) ?? records[0];
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl bg-neutral-950 p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
          Priority review
        </p>
        <h2 className="mt-2 text-xl font-bold">{urgent.title}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          {urgent.nextStep}
        </p>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs">
          <span className="text-neutral-400">SLA</span>
          <span className="font-bold text-white">{urgent.sla}</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(urgent.id)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-neutral-950"
        >
          Open priority review <ArrowUpRight className="size-4" />
        </button>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-600" />
          <h2 className="font-bold text-neutral-950">Governance signal</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {kind === "moderation"
            ? "Sustainability claims account for 62% of manual listing reviews this month."
            : kind === "kyc"
              ? "Automated registry screening resolved 78% of low-risk identity checks without escalation."
              : "Evidence-complete dispute cases resolve 2.1 days faster than incomplete cases."}
        </p>
      </div>
    </aside>
  );
}

function GovernanceDetail({
  kind,
  record,
}: {
  kind: GovernanceKind;
  record: GovernanceRecord;
}) {
  const router = useRouter();
  const Icon = kindIcon(kind);
  const [tab, setTab] = useState<GovernanceTab>("Overview");
  const [localStatus, setLocalStatus] = useState(record.status);
  const [notice, setNotice] = useState("");
  const act = (message: string, status?: string) => {
    setNotice(message);
    if (status) setLocalStatus(status);
  };

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <button
          type="button"
          onClick={() => router.push(`/admin/${kind}`)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" />
          Back to{" "}
          {kind === "moderation"
            ? "moderation"
            : kind === "kyc"
              ? "KYC verification"
              : "disputes"}
        </button>
        <section className="overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Icon className="size-4" />
                  {record.id}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(localStatus)}`}
                >
                  {localStatus}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${riskTone(record.risk)}`}
                >
                  {record.risk} risk
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">
                {record.title}
              </h1>
              <p className="mt-2 text-sm text-neutral-400">{record.subtitle}</p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-300">
                {record.summary}
              </p>
            </div>
            <GovernanceActions
              kind={kind}
              status={localStatus}
              onAction={act}
            />
          </div>
          <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
            <HeroMetric label="Owner" value={record.owner} />
            <HeroMetric label="Exposure" value={record.value} />
            <HeroMetric label="Submitted" value={record.submitted} />
            <HeroMetric label="SLA" value={record.sla} />
          </div>
        </section>
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex overflow-x-auto border-b border-neutral-200">
          {(
            ["Overview", "Evidence", "Checks", "Activity"] as GovernanceTab[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === item ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "Overview" && (
          <OverviewTab
            kind={kind}
            record={record}
            onOpenEvidence={() => setTab("Evidence")}
          />
        )}
        {tab === "Evidence" && (
          <EvidenceTab record={record} onAction={setNotice} />
        )}
        {tab === "Checks" && <ChecksTab record={record} />}
        {tab === "Activity" && <ActivityTab record={record} />}
      </div>
    </div>
  );
}

function GovernanceActions({
  kind,
  status,
  onAction,
}: {
  kind: GovernanceKind;
  status: string;
  onAction: (message: string, status?: string) => void;
}) {
  if (kind === "disputes")
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onAction("Buyer and seller evidence request sent.", "Under review")
          }
          className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
        >
          Request evidence
        </button>
        <button
          type="button"
          onClick={() =>
            onAction("Refund proposal prepared for final approval.")
          }
          className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
        >
          Prepare refund
        </button>
        <button
          type="button"
          onClick={() =>
            onAction(
              "Resolution recorded and party notifications prepared.",
              "Resolved",
            )
          }
          disabled={status === "Resolved"}
          className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950 disabled:opacity-50"
        >
          {status === "Resolved" ? "Resolved" : "Resolve case"}
        </button>
      </div>
    );
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() =>
          onAction(
            kind === "kyc"
              ? "Outstanding document request sent to the applicant."
              : "Replacement evidence request sent to the seller.",
            kind === "kyc" ? "Awaiting docs" : "Flagged",
          )
        }
        className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
      >
        Request evidence
      </button>
      <button
        type="button"
        onClick={() =>
          onAction(
            `${kind === "kyc" ? "Verification" : "Listing"} rejected with an auditable decision note.`,
            "Rejected",
          )
        }
        className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
      >
        Reject
      </button>
      <button
        type="button"
        onClick={() =>
          onAction(
            `${kind === "kyc" ? "Verification" : "Listing"} approved and access controls updated.`,
            "Approved",
          )
        }
        disabled={status === "Approved"}
        className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950 disabled:opacity-50"
      >
        {status === "Approved" ? "Approved" : "Approve"}
      </button>
    </div>
  );
}

function OverviewTab({
  kind,
  record,
  onOpenEvidence,
}: {
  kind: GovernanceKind;
  record: GovernanceRecord;
  onOpenEvidence: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-950">
          {kind === "moderation"
            ? "Listing review"
            : kind === "kyc"
              ? "Identity profile"
              : "Case overview"}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {record.details.map((item) => (
            <Detail key={item.label} {...item} />
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {record.related.map((item) => (
            <LinkedRecord key={`${item.label}-${item.value}`} {...item} />
          ))}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-950">
            Recommended next step
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {record.nextStep}
          </p>
          <button
            type="button"
            onClick={onOpenEvidence}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white"
          >
            Review evidence <ChevronRight className="size-4" />
          </button>
        </div>
        <Link
          href={record.primaryLink.href}
          className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-bold text-neutral-900 shadow-sm hover:bg-neutral-50"
        >
          <span>{record.primaryLink.label}</span>
          <ArrowUpRight className="size-4 text-neutral-400" />
        </Link>
      </aside>
    </div>
  );
}

function EvidenceTab({
  record,
  onAction,
}: {
  record: GovernanceRecord;
  onAction: (message: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-950">
            Evidence workspace
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Review, request, and attach evidence used in this decision.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onAction("Evidence upload workspace opened for this review.")
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Upload className="size-4" />
          Add evidence
        </button>
      </div>
      <div className="divide-y divide-neutral-100">
        {record.evidence.map((item) => (
          <div
            key={item.name}
            className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_180px_120px_40px] md:items-center"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                <FileCheck2 className="size-4 text-neutral-600" />
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {item.type} · {item.owner}
                </p>
              </div>
            </div>
            <QueueField label="Evidence type" value={item.type} />
            <span
              className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.state === "Verified" ? "bg-emerald-50 text-emerald-700" : item.state === "Missing" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
            >
              {item.state}
            </span>
            <button
              type="button"
              onClick={() =>
                onAction(`${item.name} prepared for secure review.`)
              }
              aria-label={`Review ${item.name}`}
              className="flex size-9 items-center justify-center rounded-lg border border-neutral-200"
            >
              <Eye className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChecksTab({ record }: { record: GovernanceRecord }) {
  const passed = record.checks.filter(
    (check) => check.state === "Passed",
  ).length;
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-950">Decision checks</h2>
        <div className="mt-5 space-y-3">
          {record.checks.map((check) => (
            <div
              key={check.label}
              className="flex gap-3 rounded-xl border border-neutral-100 p-4"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${check.state === "Passed" ? "bg-emerald-50 text-emerald-700" : check.state === "Failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
              >
                {check.state === "Passed" ? (
                  <Check className="size-4" />
                ) : check.state === "Failed" ? (
                  <X className="size-4" />
                ) : (
                  <CircleAlert className="size-4" />
                )}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-neutral-900">
                    {check.label}
                  </p>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    {check.state}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  {check.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="rounded-2xl bg-neutral-950 p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
          Readiness
        </p>
        <p className="mt-3 text-4xl font-bold">
          {Math.round((passed / Math.max(record.checks.length, 1)) * 100)}%
        </p>
        <p className="mt-2 text-sm text-neutral-400">
          {passed} of {record.checks.length} checks passed
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{
              width: `${(passed / Math.max(record.checks.length, 1)) * 100}%`,
            }}
          />
        </div>
        <p className="mt-5 text-xs leading-5 text-neutral-400">
          Manual review remains required for any review or failed check.
        </p>
      </aside>
    </section>
  );
}

function ActivityTab({ record }: { record: GovernanceRecord }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-neutral-950">
        Governance audit trail
      </h2>
      <div className="mt-6">
        {record.activity.map((event, index) => (
          <div key={`${event.title}-${event.date}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <History className="size-4" />
              </span>
              {index < record.activity.length - 1 && (
                <span className="h-14 w-px bg-neutral-200" />
              )}
            </div>
            <div className="pb-7">
              <p className="text-sm font-bold text-neutral-900">
                {event.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {event.detail}
              </p>
              <p className="mt-1 text-[11px] font-medium text-neutral-400">
                {event.date}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QueueMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-neutral-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}
function QueueField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-medium text-neutral-700">
        {value}
      </p>
    </div>
  );
}
function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 p-5 sm:border-r last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-5 text-neutral-900">
        {value}
      </p>
    </div>
  );
}
function LinkedRecord({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-neutral-900">{value}</span>
        <Link2 className="size-4 text-neutral-400" />
      </div>
    </Link>
  );
}

export function AdminModerationCenter({ caseId }: { caseId?: string }) {
  return <AdminGovernanceCenter kind="moderation" recordId={caseId} />;
}
export function AdminKycCenter({
  verificationId,
}: {
  verificationId?: string;
}) {
  return <AdminGovernanceCenter kind="kyc" recordId={verificationId} />;
}
export function AdminDisputesCenter({ disputeId }: { disputeId?: string }) {
  return <AdminGovernanceCenter kind="disputes" recordId={disputeId} />;
}
