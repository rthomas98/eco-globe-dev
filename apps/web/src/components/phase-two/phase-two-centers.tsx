"use client";

import { SavedPartnerNetwork } from "./saved-partner-network";
import { FeatureUnavailable } from "../preview/feature-unavailable";

type Role = "buyer" | "seller" | "admin";

export { SavedDeliveryTracking as DeliveryTrackingCenter } from "./saved-delivery-tracking";

export function PartnerNetworkCenter({ role: _role }: { role: Role }) {
  return <SavedPartnerNetwork />;
}

export function AssetVerificationCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="ASSET VERIFICATION"
      title="Material asset verification"
      description="Independent asset verification is planned for a later phase. Listing lab reports, document review and company verification remain available in their own sections."
    />
  );
}

export function MapIntelligenceCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="MAP AND ZIP INTELLIGENCE"
      title="Lane cost and carbon comparison"
      description="Facility intelligence and lane estimates are planned for a later phase. The marketplace map and saved logistics routes use real listing and shipment records."
    />
  );
}

export function AnalyticsCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="ANALYTICS"
      title="Network analytics"
      description="Cross-portal analytics are planned for a later phase. Reports show totals calculated from your recorded orders and listings."
    />
  );
}

export function RecommendationsCenter({ role }: { role: Role }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="RECOMMENDATIONS"
      title="Product and action recommendations"
      description="Recommendations are planned for a later phase and are not generated from marketplace activity yet."
    />
  );
}
