import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="Verification"
      title="Feedstock certifications"
      intro="Buyers don't pay for marketing claims — they pay for documentation. Every listing on EcoGlobe carries the certifications a refinery, mill, or chemical plant actually needs to take possession."
      sections={[
        {
          heading: "What we verify",
          body: [
            "Safety Data Sheet (SDS) — required on every listing before a buyer can transact.",
            "Origin facility documentation — corporate ownership, address, and operating permits.",
            "Sustainability claims — third-party certifications surfaced as flags on the listing.",
            "Quality and composition — uploaded by the seller, attached to the listing record.",
          ],
        },
        {
          heading: "Working certifiers",
          body: "We're partnering with independent labs and certifiers to provide marketplace-grade attestations. Reach out if your organization wants to participate or recommend a partner.",
        },
        {
          heading: "Audit trail",
          body: "Every document upload, edit, and verification status change is logged. Sellers and buyers see the same history — no surprises at closing.",
        },
      ]}
      ctaLabel="Talk to verification team"
      ctaHref="mailto:info@ecoglobeworld.com?subject=Certifications%20inquiry"
    />
  );
}
