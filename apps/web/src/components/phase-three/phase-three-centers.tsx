"use client";

import { FeatureUnavailable } from "../preview/feature-unavailable";

type Role = "buyer" | "seller" | "admin" | "public";

export function BlockchainTraceabilityCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="BLOCKCHAIN TRACEABILITY"
      title="Blockchain traceability"
      description="On-chain traceability is not part of this release. Order, contract and shipment history is kept in the EcoGlobe audit log."
    />
  );
}

export function SmartContractAutomationCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="SMART CONTRACTS"
      title="Smart contract automation"
      description="Automated contract rules are not part of this release. Agreements are prepared and signed through the Contracts and E-signatures sections."
    />
  );
}

export function LanguageReadinessCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="LANGUAGE"
      title="Multi-language marketplace"
      description="EcoGlobe is currently available in English only. Additional languages are planned for a later phase."
    />
  );
}

export function NationalExpansionCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="NATIONAL EXPANSION"
      title="National expansion planning"
      description="Regional expansion planning is not part of this release."
    />
  );
}

export function MobileAccessPreviewCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="MOBILE ACCESS"
      title="Native mobile app"
      description="A native mobile app is not available yet. The EcoGlobe website works on phone browsers for buyers, sellers and staff."
    />
  );
}
