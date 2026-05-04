import { InfoPage } from "@/components/public/info-page";

export default function Page() {
  return (
    <InfoPage
      eyebrow="Payments"
      title="Get paid securely"
      intro="Industrial trades are too big to settle on a handshake. EcoGlobe holds buyer funds in escrow, releases on delivery confirmation, and routes payouts to the seller's account on file."
      sections={[
        {
          heading: "How payment flows",
          body: [
            "Buyer approves the seller's quote and funds escrow with a saved bank account.",
            "Seller receives the order confirmation, prepares the shipment, and uploads the BOL.",
            "Buyer confirms delivery once the material is verified — escrow releases automatically.",
            "If the buyer reports an issue, escrow stays on hold while EcoGlobe reviews.",
          ],
        },
        {
          heading: "Where the money sits",
          body: "Escrow funds are held by our payments partner in a segregated account. They're not exposed to EcoGlobe's operating balance.",
        },
        {
          heading: "Bank accounts and payouts",
          body: "Sellers manage payout accounts in Accounting → Bank Account. Make-as-default, edit, and delete are all self-service. Payouts arrive 1–2 business days after escrow release.",
        },
        {
          heading: "Disputes and refunds",
          body: "If something arrives damaged or doesn't match the listing, the buyer files a dispute through the order page. Escrow holds while we work it out — refund or partial release decided based on the documentation.",
        },
      ]}
      ctaLabel="Read more about escrow"
      ctaHref="/buyer/accounting/escrow"
    />
  );
}
