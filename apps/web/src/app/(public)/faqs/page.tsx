import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="FAQs"
      title="Frequently asked questions"
      intro="The answers we get asked most often. If your question isn't here, our team replies within one business day."
      sections={[
        {
          heading: "What kind of feedstocks does EcoGlobe trade?",
          body: "Anything you'd otherwise pay to dispose of — pyrolysis pitch, FCC slurry oil, hydrochar, biochar, used pallets, mixed plastics, sugarcane bagasse, corn stover, used cooking oil, and dozens more. If you don't see your stream listed, the white-label option lets you list it directly.",
        },
        {
          heading: "How does escrow work?",
          body: "When a buyer approves a quote they fund escrow with a saved payment method. Funds sit until the buyer confirms delivery — at that point escrow releases to the seller. If a buyer reports an issue, escrow stays on hold while EcoGlobe reviews.",
        },
        {
          heading: "Why do sellers have to upload an SDS?",
          body: "Buyers can't legally take possession of an industrial feedstock without a Safety Data Sheet (or the EU REACH equivalent). We require it on every listing so the transaction can actually close.",
        },
        {
          heading: "What does the Carbon Calculator measure?",
          body: "Today, transportation emissions only — distance, weight, and transport mode (light/heavy truck, rail, barge, pipeline). Manufacturing emissions arrive in a future release once we wire up an EcoInvent feed.",
        },
        {
          heading: "Can my company have multiple facilities?",
          body: "Yes. Profiles support multi-site setups (e.g. Shell Norco + Shell Deer Park) and the Carbon Calculator distance step lets buyers pick which facility to ship to.",
        },
        {
          heading: "Who can see my listing?",
          body: "Anonymous visitors only see the feedstock type and total volume. Pricing, location, specs, and SDS download are gated to signed-in members.",
        },
      ]}
    />
  );
}
