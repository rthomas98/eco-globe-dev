import { Globe, BarChart3, Truck, UserCheck, FileText, CheckCircle, Handshake, Leaf } from "lucide-react";
import Link from "next/link";
import { Button } from "@eco-globe/ui";
import { Header } from "./header";
import { CTABannerSection } from "./cta-banner-section";
import { Footer } from "./footer";

const whySellFeatures = [
  { icon: Globe, title: "Access Qualified Buyers", desc: "Reach buyers actively looking for verified sustainable suppliers." },
  { icon: Leaf, title: "Sustainability Verification", desc: "Showcase certifications and compliance with confidence." },
  { icon: BarChart3, title: "Market Intelligence Built for Sellers", desc: "Know the right timing, pricing, and regions to sell — powered by real transaction data." },
  { icon: Truck, title: "Logistics That Protect Your Margins", desc: "Optimized routes and shipment strategies designed specifically for bulk, cost-sensitive feedstocks." },
];

const howItWorksSteps = [
  { icon: UserCheck, title: "Create Your Seller Account", desc: "Provide company information and details." },
  { icon: FileText, title: "Tell us about your feedstock", desc: "Add product specs, volume, availability date and upload documentation." },
  { icon: CheckCircle, title: "Verification & Approval", desc: "Our team reviews, validates and certifies your feedstock entries." },
  { icon: Handshake, title: "Connect with Buyers", desc: "Get discovered, receive inquiries, and build partnerships. Don't worry about the delivery." },
];

const unlockingFeatures = [
  { title: "Unlock New Revenue Streams — Sustainably", desc: "Generate new revenue opportunities while strengthening your sustainability profile." },
  { title: "Expand Applications, Increase Value", desc: "Discover new industrial applications for your feedstock that can command higher pricing." },
  { title: "Certified Transparency & Traceability", desc: "Build trust with buyers through verified processes and documented supply chains." },
  { title: "Optimized Logistics, Simplified Operations", desc: "We help you reduce logistics complexity — so you can focus on production, not coordination." },
];

export function SellersPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header transparent />

      {/* Hero */}
      <section className="relative flex h-[350px] sm:h-[400px] lg:h-[500px] items-center justify-center overflow-hidden">
        <img
          src="/images/sellers-hero-marketplace.png"
          alt="Industrial feedstock supply facility"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/40" />
        <div className="relative z-10 text-center px-4">
          <h1 className="mb-6 text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white">
            Grow Your Business with<br />Trusted Buyers
          </h1>
          <p className="mb-8 max-w-[600px] text-lg text-white/80">
            EcoGlobe helps verified suppliers connect with buyers who value sustainability, compliance, and long-term partnerships.
          </p>
          <Link href="/register">
            <Button variant="white" size="lg">Start Selling Now</Button>
          </Link>
        </div>
      </section>

      {/* Why Sell on EcoGlobe */}
      <section className="py-16 lg:py-[120px]">
        <div className="mx-auto flex flex-col lg:flex-row max-w-[1440px] gap-8 lg:gap-16 px-4 sm:px-8 lg:px-[135px]">
          <div className="h-[250px] sm:h-[350px] lg:h-[420px] w-full lg:w-[450px] shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            <img
              src="/images/sellers-why-sell.png"
              alt="Responsible supplier operations"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider" style={{ color: "#96794A" }}>Why Sell on EcoGlobe</p>
            <h2 className="mb-10 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Built to Support<br />Responsible Suppliers</h2>
            <div className="flex flex-col gap-8">
              {whySellFeatures.map((f) => (
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
            <h2 className="mb-10 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Start Selling in a Few<br />Simple Steps</h2>
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
              src="/images/sellers-how-it-works.png"
              alt="Feedstock onboarding and verification workflow"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Unlocking Value */}
      <section className="py-16 lg:py-[120px]">
        <div className="mx-auto flex flex-col lg:flex-row max-w-[1440px] gap-8 lg:gap-16 px-4 sm:px-8 lg:px-[135px]">
          <div className="h-[250px] sm:h-[350px] lg:h-[420px] w-full lg:w-[450px] shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            <img
              src="/images/sellers-unlocking-value.png"
              alt="Marketplace-ready feedstock inventory"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider" style={{ color: "#96794A" }}>What EcoGlobe Does for You</p>
            <h2 className="mb-10 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Unlocking the Full Value<br />of Your Feedstock</h2>
            <div className="flex flex-col gap-8">
              {unlockingFeatures.map((f) => (
                <div key={f.title}>
                  <h3 className="text-base font-bold text-neutral-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-neutral-700">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability */}
      <section className="bg-neutral-100 py-12 lg:py-[100px]">
        <div className="mx-auto flex flex-col lg:flex-row max-w-[1440px] items-center gap-8 lg:gap-16 px-4 sm:px-8 lg:px-[135px]">
          <div className="h-[250px] sm:h-[300px] w-full lg:w-[450px] shrink-0 overflow-hidden rounded-2xl bg-neutral-200">
            <img
              src="/images/sellers-sustainability-proof.png"
              alt="Traceability and sustainability verification workflow"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="mb-6 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Sustainability You<br />Can Prove</h2>
            <p className="text-base leading-7 text-neutral-700">
              EcoGlobe uses a structured verification process to ensure sustainability claims are supported by real documentation. Buyers see verified information — not marketing promises.
            </p>
          </div>
        </div>
      </section>

      <CTABannerSection />
      <Footer />
    </main>
  );
}
