import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="Logistics"
      title="Logistics that protect your margins"
      intro="Industrial feedstocks are bulk, cost-sensitive, and sometimes hazardous. Logistics is where deals fall apart. EcoGlobe coordinates carriers, BOLs, and chain-of-custody so your transaction actually closes."
      sections={[
        {
          heading: "Modes we cover",
          body: [
            "Light-duty box truck — small batches, urban facilities, retail-ready.",
            "Heavy 20-wheeler — the workhorse for solid feedstocks.",
            "Tanker trailer — liquid feedstocks moving by road.",
            "Rail — long-haul solids, lowest emission per ton-mile.",
            "10k and 55k bbl barges — chemical and asphalt-grade liquids on inland waterways.",
            "Gas and liquid pipelines — for partners on the network.",
          ],
        },
        {
          heading: "What's coordinated",
          body: "Carrier matching, scheduling, BOL generation, chain-of-custody documentation, and live status updates surfaced on the buyer's order page.",
        },
        {
          heading: "Carbon-aware planning",
          body: "Buyers compare transport modes in the Carbon Calculator before committing. Lowest-footprint option wins by default — and the chosen mode is logged with the transaction.",
        },
      ]}
      ctaLabel="Get a logistics quote"
      ctaHref="mailto:info@ecoglobeworld.com?subject=Logistics%20quote"
    />
  );
}
