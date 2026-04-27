import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="Sustainability"
      title="Sustainability reports"
      intro="Every order on EcoGlobe leaves a paper trail buyers and sellers can defend to their auditors. We publish quarterly snapshots of marketplace-wide diversion volumes and per-listing carbon savings."
      sections={[
        {
          heading: "What we report",
          body: [
            "Tons of industrial byproducts diverted from landfill or incineration.",
            "Carbon footprint avoided across funded transactions (transport-only today; manufacturing once we have the data).",
            "Verified-supplier coverage by industry and region.",
          ],
        },
        {
          heading: "How we calculate",
          body: "Distance and weight come from listing + facility data. Emission factors are the EPA / EU REACH benchmarks documented in our Carbon Calculator. Every figure traces back to a specific transaction so you can audit the math.",
        },
        {
          heading: "Get the latest report",
          body: "Quarterly PDF. Email us if you'd like the next issue when it ships, or want a custom slice for your operation.",
        },
      ]}
      ctaLabel="Request the latest report"
      ctaHref="mailto:info@ecoglobeworld.com?subject=Sustainability%20report%20request"
    />
  );
}
