import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="Traceability"
      title="Product passports"
      intro="A product passport is the digital paper trail every industrial feedstock should have — origin facility, composition, certifications, transport history, and downstream end-use, all bound to a persistent identifier."
      sections={[
        {
          heading: "What's in a passport",
          body: [
            "Origin: which facility produced the lot, when, and under what process.",
            "Specs: composition, quality, and any associated SDS / safety documents.",
            "Verification: third-party certifications and audit history.",
            "Chain-of-custody: every leg of transport, with carrier and timestamp.",
            "End-use: who took possession, what they did with it.",
          ],
        },
        {
          heading: "Why it matters",
          body: "EU Digital Product Passport regulations are arriving in waves. Buyers are starting to ask for traceability before procurement teams have a system in place. Building the passport into the marketplace from day one means our sellers and buyers are ready before the deadline.",
        },
        {
          heading: "Status",
          body: "Passports are issued automatically when a transaction closes on EcoGlobe. The data layer is in place; the public-facing passport viewer ships in a future release.",
        },
      ]}
      ctaLabel="Talk to the team"
      ctaHref="mailto:info@ecoglobeworld.com?subject=Product%20passport%20question"
    />
  );
}
