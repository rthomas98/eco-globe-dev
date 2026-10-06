import Link from "next/link";
import { Button } from "@eco-globe/ui";
import { Header } from "@/components/public/header";
import { Footer } from "@/components/public/footer";
import { FEEDSTOCK_IQ } from "./feedstock-iq-copy";

const PLANNED = [
  {
    heading: "For buyers",
    body: "Follow availability for the feedstocks you source and see when matching supply is listed.",
  },
  {
    heading: "For sellers",
    body: "Compare your listing pricing with the market before you publish.",
  },
  {
    heading: "Built on marketplace activity",
    body: "Insights will come from listings and orders on EcoGlobe. Nothing is shown until there is enough data to be useful.",
  },
];

/** Public coming-soon page for Feedstock IQ. */
export function FeedstockIqPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="pb-16 pt-24 lg:pb-24 lg:pt-32">
        <div className="mx-auto max-w-[840px] px-4 sm:px-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider" style={{ color: "#96794A" }}>
            {FEEDSTOCK_IQ.status}
          </p>
          <h1 className="mb-6 text-2xl font-bold leading-tight text-neutral-900 sm:text-4xl lg:text-5xl">
            {FEEDSTOCK_IQ.name}
          </h1>
          <p className="text-base leading-7 text-neutral-700">{FEEDSTOCK_IQ.tagline}</p>
          <p className="mt-3 text-base leading-7 text-neutral-700">
            Feedstock IQ is not available yet. The marketplace is open today: browse published listings or list your own feedstock.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/browse">
              <Button variant="primary" size="md">Browse feedstocks</Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="md">Ask us about Feedstock IQ</Button>
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PLANNED.map((item) => (
              <div key={item.heading} className="rounded-xl bg-neutral-50 p-5">
                <h2 className="mb-2 text-base font-bold text-neutral-900">{item.heading}</h2>
                <p className="text-sm leading-6 text-neutral-700">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
