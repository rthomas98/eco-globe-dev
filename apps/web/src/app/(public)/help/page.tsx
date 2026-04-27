import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="Help Center"
      title="How can we help?"
      intro="Most answers live in the FAQs. For anything else, the team replies within one business day."
      sections={[
        {
          heading: "Buyers",
          body: [
            "Track an order or open a dispute from My Orders.",
            "Run a footprint estimate in the Carbon Calculator before you commit.",
            "Manage saved payment methods and review past transactions in Accounting.",
          ],
        },
        {
          heading: "Sellers",
          body: [
            "Add or edit a listing from your Listings dashboard.",
            "Upload an SDS so buyers can transact — listings without an SDS are read-only.",
            "Manage availability windows and frequency from the listing edit screen.",
          ],
        },
        {
          heading: "Couldn't find an answer?",
          body: "Email us at info@ecoglobeworld.com with your question and the URL you were on. We're a small team — we read everything.",
        },
      ]}
      ctaLabel="Email support"
      ctaHref="mailto:info@ecoglobeworld.com?subject=EcoGlobe%20Help"
    />
  );
}
