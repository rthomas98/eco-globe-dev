import { Shield, Eye, TrendingDown, Handshake, UserPlus, Search, FileCheck, Link2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@eco-globe/ui";
import { Header } from "./header";
import { CTABannerSection } from "./cta-banner-section";
import { Footer } from "./footer";

const whyBuyFeatures = [
  { icon: Shield, title: "Verified Supplier Network", desc: "Work only with suppliers that have passed sustainability and compliance checks." },
  { icon: Eye, title: "Transparent Process", desc: "Access certifications, audits, and supporting documents in one place." },
  { icon: TrendingDown, title: "Reduced Sourcing Risk", desc: "Make informed decisions backed by verified data — not claims." },
  { icon: Handshake, title: "Built for Long-Term Partnerships", desc: "Connect beyond transactions and build trusted supplier relationships." },
];

const howItWorksSteps = [
  { icon: UserPlus, title: "Create a Buyer Account", desc: "Set up your company profile and sourcing needs." },
  { icon: Search, title: "Discover Verified Seller", desc: "Search by volume, by product specs, by distance." },
  { icon: FileCheck, title: "Review Sustainability Credentials", desc: "Evaluate certifications and supporting documents." },
  { icon: Link2, title: "Connect & Source", desc: "Engage suppliers, request quotes, and manage sourcing activities." },
];

export function BuyersPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header transparent />

      {/* Hero */}
      <section className="relative flex h-[350px] sm:h-[400px] lg:h-[500px] items-center justify-center overflow-hidden">
        <img
          src="/images/buyers-hero-marketplace.png"
          alt="Buyer-side industrial sourcing environment"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/40" />
        <div className="relative z-10 text-center px-4">
          <h1 className="mb-6 text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white">
            Source Verified Suppliers.<br />Ready to Trade When You Are.
          </h1>
          <p className="mb-8 max-w-[600px] text-lg text-white/80">
            EcoGlobe helps buyers discover and connect with verified suppliers through transparent sustainability data, structured verification, and streamlined sourcing tools.
          </p>
          <Link href="/register">
            <Button variant="white" size="lg">Join as a Buyer</Button>
          </Link>
        </div>
      </section>

      {/* Why Buy on EcoGlobe */}
      <section className="py-16 lg:py-[120px]">
        <div className="mx-auto flex flex-col lg:flex-row max-w-[1440px] gap-8 lg:gap-16 px-4 sm:px-8 lg:px-[135px]">
          <div className="h-[250px] sm:h-[350px] lg:h-[420px] w-full lg:w-[450px] shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            <img
              src="/images/buyers-why-buy.png"
              alt="Verified supplier evaluation setup"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider" style={{ color: "#96794A" }}>Why Buy on EcoGlobe</p>
            <h2 className="mb-10 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Designed for<br />Sustainable Sourcing<br />Teams</h2>
            <div className="flex flex-col gap-8">
              {whyBuyFeatures.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <f.icon className="mt-1 size-5 shrink-0 text-neutral-700" />
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">{f.title}</h3>
                    <p className="mt-1 text-sm text-neutral-700">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-neutral-100 py-16 lg:py-[120px]">
        <div className="mx-auto flex flex-col lg:flex-row max-w-[1440px] gap-8 lg:gap-16 px-4 sm:px-8 lg:px-[135px]">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider" style={{ color: "#96794A" }}>How It Works</p>
            <h2 className="mb-10 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Find the Right Supplier<br />in a Few Steps</h2>
            <div className="flex flex-col gap-8">
              {howItWorksSteps.map((s) => (
                <div key={s.title} className="flex gap-4">
                  <s.icon className="mt-1 size-5 shrink-0 text-neutral-700" />
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">{s.title}</h3>
                    <p className="mt-1 text-sm text-neutral-700">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[250px] sm:h-[350px] lg:h-[420px] w-full lg:w-[450px] shrink-0 overflow-hidden rounded-2xl bg-neutral-200">
            <img
              src="/images/buyers-how-it-works.png"
              alt="Buyer procurement workflow"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Sustainability */}
      <section className="py-12 lg:py-[100px]">
        <div className="mx-auto flex flex-col lg:flex-row max-w-[1440px] items-center gap-8 lg:gap-16 px-4 sm:px-8 lg:px-[135px]">
          <div className="h-[250px] sm:h-[300px] w-full lg:w-[450px] shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            <img
              src="/images/buyers-sustainability-proof.png"
              alt="Traceability and sustainability verification setup"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="mb-6 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Sustainability You<br />Can Prove</h2>
            <p className="text-base leading-7 text-neutral-700">
              Every supplier on EcoGlobe goes through a structured verification process, we will have certifier companies that assure our process. Sustainability claims are reviewed, documented, and made visible — so you can source with confidence.
            </p>
          </div>
        </div>
      </section>

      <CTABannerSection />
      <Footer />
    </main>
  );
}
