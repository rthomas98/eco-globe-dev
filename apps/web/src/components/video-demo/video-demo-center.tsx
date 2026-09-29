"use client";

import { FeatureUnavailable } from "../preview/feature-unavailable";

type Role = "buyer" | "seller" | "admin" | "public";

export function VideoDemoCenter({ role }: { role: Role; demoId?: string }) {
  return (
    <FeatureUnavailable
      role={role}
      eyebrow="VIDEO DEMOS"
      title="Product walkthrough videos"
      description="Recorded walkthroughs have not been published yet. Contact the EcoGlobe team for a live demonstration."
    />
  );
}
