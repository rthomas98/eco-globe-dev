import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="Beyond the marketplace"
      title="Other digital products"
      intro="The marketplace is the obvious thing. Underneath it, we've built a stack of digital tools your sustainability and procurement teams can plug into the workflows they already run."
      sections={[
        {
          heading: "Carbon Calculator API",
          body: "The same engine that powers buyer-side scenario comparisons, available as a direct integration. Send distance + weight + transport mode, get back tons CO₂eq with the formula provenance.",
        },
        {
          heading: "Product passports",
          body: "A persistent identifier per feedstock lot, traceable from origin facility through delivery and end-use. EU Digital Product Passport ready.",
        },
        {
          heading: "ESG export",
          body: "Pull marketplace activity into the sustainability reporting your auditor already accepts — CSV, JSON, and a roadmap for direct CDP / GRI integrations.",
        },
        {
          heading: "Custom dashboards",
          body: "If you've got a specific metric your board cares about, we can wire a dashboard. Talk to us.",
        },
      ]}
      ctaLabel="Talk to the platform team"
      ctaHref="mailto:info@ecoglobeworld.com?subject=Digital%20products"
    />
  );
}
