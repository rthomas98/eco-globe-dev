import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="Join us"
      title="Careers at EcoGlobe"
      intro="We're a small team building the verified marketplace the circular economy has been waiting for. If turning industrial byproducts into revenue sounds like the kind of problem you'd like to spend a few years on, we'd love to hear from you."
      sections={[
        {
          heading: "What we look for",
          body: [
            "Builders who can turn a tangled industrial workflow into something a sustainability manager actually wants to use.",
            "Engineers comfortable working across the stack — Next.js / TypeScript / data pipelines.",
            "Designers and writers who can make complex feedstock data feel approachable.",
            "Sales and operations talent with refinery, petrochemical, or pulp & paper backgrounds.",
          ],
        },
        {
          heading: "How we work",
          body: "Hybrid out of Baton Rouge, with travel to partner facilities. Generous equity, transparent comp, and a genuinely small team — every hire moves the roadmap.",
        },
        {
          heading: "Open roles",
          body: "We post specific roles as they open. For now, send us your story — even if there isn't a posting that fits, we want to know who's out there.",
        },
      ]}
      ctaLabel="Send us your story"
      ctaHref="mailto:info@ecoglobeworld.com?subject=EcoGlobe%20Careers"
    />
  );
}
