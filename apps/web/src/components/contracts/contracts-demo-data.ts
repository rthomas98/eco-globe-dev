export type ContractStatus =
  | "Draft"
  | "Negotiating"
  | "Signature pending"
  | "Active"
  | "Renewal due"
  | "At risk";

export type SignatureStatus =
  | "Not sent"
  | "Buyer signed"
  | "Seller signed"
  | "Fully signed";

export interface ContractMilestone {
  label: string;
  due: string;
  status: "Complete" | "Due soon" | "Open" | "Blocked";
}

export interface ServiceContract {
  id: string;
  template: string;
  product: string;
  buyer: string;
  seller: string;
  volume: string;
  price: string;
  term: string;
  startDate: string;
  renewalDate: string;
  status: ContractStatus;
  signatureStatus: SignatureStatus;
  paymentTerms: string;
  deliveryFrequency: string;
  nextAction: string;
  risk: "Low" | "Medium" | "High";
  milestones: ContractMilestone[];
}

export interface ContractTemplate {
  name: string;
  purpose: string;
  terms: string[];
  usage: number;
}

export type SignatureEnvelopeStatus =
  | "Draft"
  | "Email sent"
  | "Viewed"
  | "Partially signed"
  | "Completed"
  | "Declined";

export interface SignatureSigner {
  role: "Buyer" | "Seller";
  name: string;
  email: string;
  status: "Waiting" | "Viewed" | "Signed";
  signedAt?: string;
}

export interface SignatureAuditEvent {
  time: string;
  actor: string;
  event: string;
  detail: string;
}

export interface SignatureEnvelope {
  id: string;
  contractId: string;
  subject: string;
  status: SignatureEnvelopeStatus;
  sentAt: string;
  expiresAt: string;
  provider: string;
  compliance: "Compliant" | "Review needed";
  ipAddress: string;
  device: string;
  signers: SignatureSigner[];
  auditTrail: SignatureAuditEvent[];
}

export const serviceContracts: ServiceContract[] = [
  {
    id: "CTR-1048",
    template: "Recurring bulk feedstock supply",
    product: "Black Gypsum",
    buyer: "GreenHarvest Co.",
    seller: "EcoPack Co.",
    volume: "200 tons / month",
    price: "$52 / ton",
    term: "12 months",
    startDate: "Jun 1, 2026",
    renewalDate: "May 15, 2027",
    status: "Active",
    signatureStatus: "Fully signed",
    paymentTerms: "Escrow funded per monthly delivery window",
    deliveryFrequency: "Monthly, first week",
    nextAction: "July delivery milestone opens in 8 days.",
    risk: "Low",
    milestones: [
      { label: "Counterparty signatures", due: "May 21, 2026", status: "Complete" },
      { label: "Initial escrow deposit", due: "May 25, 2026", status: "Complete" },
      { label: "July shipment confirmation", due: "Jul 3, 2026", status: "Due soon" },
      { label: "Quarterly quality review", due: "Sep 30, 2026", status: "Open" },
    ],
  },
  {
    id: "CTR-1052",
    template: "Off-spec material offtake",
    product: "Scrap Polymer Blend with Impurities",
    buyer: "BrightFuture Corp",
    seller: "TerraGenesis Biofuels",
    volume: "1,000 tons / quarter",
    price: "EUR 60 / ton",
    term: "9 months",
    startDate: "Jul 15, 2026",
    renewalDate: "Mar 30, 2027",
    status: "Signature pending",
    signatureStatus: "Buyer signed",
    paymentTerms: "25% deposit, balance released after delivery confirmation",
    deliveryFrequency: "Quarterly release schedule",
    nextAction: "Seller signature is required before escrow funding.",
    risk: "Medium",
    milestones: [
      { label: "Terms redline review", due: "Jul 11, 2026", status: "Complete" },
      { label: "Seller e-signature", due: "Jul 16, 2026", status: "Due soon" },
      { label: "Escrow funding", due: "Jul 18, 2026", status: "Open" },
      { label: "First pickup window", due: "Jul 29, 2026", status: "Open" },
    ],
  },
  {
    id: "CTR-1057",
    template: "Equipment recovery service agreement",
    product: "Used Dry Transformer",
    buyer: "NutriFeed Industries",
    seller: "Metal Reclaim LLC",
    volume: "50 units / lot",
    price: "$800 / unit",
    term: "Single lot plus optional renewal",
    startDate: "Aug 1, 2026",
    renewalDate: "Oct 1, 2026",
    status: "Negotiating",
    signatureStatus: "Not sent",
    paymentTerms: "Escrow hold until inspection documents are approved",
    deliveryFrequency: "One pickup with renewal option",
    nextAction: "Buyer requested updated indemnity language.",
    risk: "Medium",
    milestones: [
      { label: "Template selected", due: "Jul 9, 2026", status: "Complete" },
      { label: "Legal terms negotiation", due: "Jul 20, 2026", status: "Due soon" },
      { label: "Inspection checklist", due: "Jul 24, 2026", status: "Open" },
      { label: "Signature packet", due: "Jul 26, 2026", status: "Open" },
    ],
  },
  {
    id: "CTR-1061",
    template: "Low CO2 biomass supply",
    product: "Harvested and Baled Corn Stover",
    buyer: "AgriCorp Solutions",
    seller: "Louisiana BioMass Partners",
    volume: "100 tons / month",
    price: "$42 / ton",
    term: "6 months",
    startDate: "Sep 1, 2026",
    renewalDate: "Feb 15, 2027",
    status: "Renewal due",
    signatureStatus: "Fully signed",
    paymentTerms: "Monthly invoice with escrow-backed delivery confirmation",
    deliveryFrequency: "Monthly",
    nextAction: "Renewal decision due 30 days before term end.",
    risk: "Low",
    milestones: [
      { label: "Sustainability certificate", due: "Aug 12, 2026", status: "Complete" },
      { label: "Active delivery schedule", due: "Monthly", status: "Open" },
      { label: "Renewal pricing review", due: "Jan 15, 2027", status: "Open" },
      { label: "Renewal signature", due: "Feb 15, 2027", status: "Open" },
    ],
  },
];

export const contractTemplates: ContractTemplate[] = [
  {
    name: "Recurring bulk feedstock supply",
    purpose: "Long-term monthly or quarterly supply commitments.",
    terms: ["Volume schedule", "Escrow funding", "Quality tolerances", "Renewal window"],
    usage: 18,
  },
  {
    name: "Off-spec material offtake",
    purpose: "Irregular lots, non-standard specs, and buyer acceptance rules.",
    terms: ["Acceptance criteria", "Inspection period", "Dispute process", "Price adjustment"],
    usage: 11,
  },
  {
    name: "Equipment recovery service agreement",
    purpose: "Used equipment, inspection documents, and specialty transport.",
    terms: ["Condition reports", "Indemnity", "Special handling", "Delivery confirmation"],
    usage: 7,
  },
  {
    name: "Low CO2 biomass supply",
    purpose: "Certified biomass supply with sustainability documentation.",
    terms: ["CO2 reporting", "Certification documents", "Batch traceability", "Renewal pricing"],
    usage: 14,
  },
];

export const contractAdminSummary = {
  activeContracts: 42,
  pendingSignatures: 6,
  renewalQueue: 9,
  atRiskContracts: 3,
};

export const signatureEnvelopes: SignatureEnvelope[] = [
  {
    id: "ENV-70021",
    contractId: "CTR-1052",
    subject: "Scrap Polymer Blend offtake agreement",
    status: "Partially signed",
    sentAt: "Jul 12, 2026, 9:14 AM",
    expiresAt: "Jul 19, 2026",
    provider: "EcoSign",
    compliance: "Compliant",
    ipAddress: "172.18.24.10",
    device: "Chrome on macOS",
    signers: [
      {
        role: "Buyer",
        name: "Sam Rivera",
        email: "sam@brightfuture.example",
        status: "Signed",
        signedAt: "Jul 12, 2026, 1:42 PM",
      },
      {
        role: "Seller",
        name: "Maya Chen",
        email: "maya@terragenesis.example",
        status: "Waiting",
      },
    ],
    auditTrail: [
      {
        time: "Jul 12, 2026, 9:14 AM",
        actor: "EcoGlobe",
        event: "Email package sent",
        detail: "Signature links sent to buyer and seller recipients.",
      },
      {
        time: "Jul 12, 2026, 1:39 PM",
        actor: "Sam Rivera",
        event: "Contract viewed",
        detail: "Buyer opened browser signing room from email link.",
      },
      {
        time: "Jul 12, 2026, 1:42 PM",
        actor: "Sam Rivera",
        event: "Buyer signature applied",
        detail: "IP, timestamp, and agreement hash captured.",
      },
    ],
  },
  {
    id: "ENV-70022",
    contractId: "CTR-1057",
    subject: "Used Dry Transformer recovery service agreement",
    status: "Draft",
    sentAt: "Not sent",
    expiresAt: "Jul 26, 2026",
    provider: "EcoSign",
    compliance: "Review needed",
    ipAddress: "Pending",
    device: "Pending",
    signers: [
      {
        role: "Buyer",
        name: "Nina Patel",
        email: "nina@nutrifeed.example",
        status: "Waiting",
      },
      {
        role: "Seller",
        name: "Andre Morris",
        email: "andre@metalreclaim.example",
        status: "Waiting",
      },
    ],
    auditTrail: [
      {
        time: "Jul 14, 2026, 10:08 AM",
        actor: "John Senna",
        event: "Envelope created",
        detail: "Seller prepared signature packet from equipment recovery template.",
      },
      {
        time: "Jul 14, 2026, 10:12 AM",
        actor: "EcoGlobe",
        event: "Compliance hold",
        detail: "Inspection checklist must be attached before email send.",
      },
    ],
  },
  {
    id: "ENV-70023",
    contractId: "CTR-1048",
    subject: "Black Gypsum recurring supply agreement",
    status: "Completed",
    sentAt: "May 20, 2026, 2:25 PM",
    expiresAt: "Completed",
    provider: "EcoSign",
    compliance: "Compliant",
    ipAddress: "104.22.12.88",
    device: "Safari on iPadOS",
    signers: [
      {
        role: "Buyer",
        name: "Elena Cruz",
        email: "elena@greenharvest.example",
        status: "Signed",
        signedAt: "May 20, 2026, 4:03 PM",
      },
      {
        role: "Seller",
        name: "Leo Adams",
        email: "leo@ecopack.example",
        status: "Signed",
        signedAt: "May 20, 2026, 4:37 PM",
      },
    ],
    auditTrail: [
      {
        time: "May 20, 2026, 2:25 PM",
        actor: "EcoGlobe",
        event: "Email package sent",
        detail: "Recurring supply agreement sent to both counterparties.",
      },
      {
        time: "May 20, 2026, 4:03 PM",
        actor: "Elena Cruz",
        event: "Buyer signature applied",
        detail: "Electronic consent, IP, timestamp, and hash recorded.",
      },
      {
        time: "May 20, 2026, 4:37 PM",
        actor: "Leo Adams",
        event: "Seller signature applied",
        detail: "Final signed PDF and certificate of completion generated.",
      },
    ],
  },
];

export const signatureComplianceRules = [
  "Signer identity and email delivery recorded",
  "Browser viewing event captured before signature",
  "Electronic consent checkbox required",
  "IP address, device, timestamp, and audit hash retained",
  "Final signed PDF and completion certificate archived",
];
