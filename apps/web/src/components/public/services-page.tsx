import { Globe, FlaskConical, TrendingUp, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@eco-globe/ui";
import { Header } from "./header";
import { CTABannerSection } from "./cta-banner-section";
import { Footer } from "./footer";

const consultingFeatures = [
  { icon: Globe, title: "Help you identify compatible feedstocks and buyers in your market" },
  { icon: FlaskConical, title: "Conduct pilot testing to validate technical and economic feasibility" },
  { icon: TrendingUp, title: "Support you through commercialization until you're marketplace-ready" },
  { icon: Shield, title: "Provide ongoing advisory as your business scales" },
];

const marketplaceFeatures = [
  { icon: Globe, title: "Instant access to vetted suppliers and buyers across our growing marketplace network" },
  { icon: Shield, title: "Integrated logistics, secure payments with built-in escrow, and carbon tracking" },
  { icon: TrendingUp, title: "Real-time analytics on pricing, availability, and market trends — with an interactive sourcing map to find the right match faster" },
  { icon: CheckCircle, title: "Premium tools for advanced forecasting and ESG reporting" },
];

const consultingPath = [
  "You're new to circular economy practices",
  "You're unsure about feedstock compatibility",
  "You need help navigating compliance and regulations",
  "You want to pilot test before scaling",
  "You need techno-economic validation",
];

const marketplacePath = [
  "You already know which feedstocks you need",
  "You have experience trading industrial materials",
  "You're ready to transact independently",
  "You want immediate access to buyers/sellers",
  "You need pricing transparency and speed",
];

const opportunityItems = [
  {
    icon: TrendingUp,
    title: "Give hard-to-place streams a business path",
    text: "One-time lots, irregular volumes, and off-spec materials can become listings buyers are actively searching for.",
  },
  {
    icon: Globe,
    title: "Reach cross-industry demand faster",
    text: "Cement producers, asphalt blenders, carbon plants, and chemical manufacturers can discover your material without one-by-one outreach.",
  },
  {
    icon: CheckCircle,
    title: "Use one account for both sides",
    text: "Sell what you produce and source what you need through the same network, logistics workflow, and payment rails.",
  },
];

const whyEcoGlobe = [
  { icon: Globe, text: "Integrated platform connecting industrial suppliers and buyers across waste streams" },
  { icon: Shield, text: "Founded by industry veterans with 35+ years combined experience in energy and circular economy" },
  { icon: CheckCircle, text: "Proven methodology: Our clients have diverted over 800,000 tons of waste from landfills" },
  { icon: TrendingUp, text: "From discovery to marketplace: We meet you at every stage of your circular economy journey" },
];

export function ServicesPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header transparent />

      {/* Hero */}
      <section className="relative flex h-[350px] sm:h-[400px] lg:h-[500px] items-center justify-center overflow-hidden">
        <img src="/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/40" />
        <div className="relative z-10 text-center px-4">
          <h1 className="mb-6 text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white">
            Two Ways to Transform Your<br />Waste Into Value
          </h1>
          <p className="mb-8 text-lg text-white/80">
            Whether you need guidance to get started or are ready to trade independently,<br className="hidden sm:inline" />EcoGlobe meets you where you are.
          </p>
          <Link href="/register">
            <Button variant="white" size="lg">Get Started</Button>
          </Link>
        </div>
      </section>

      {/* Two paths */}
      <section className="py-16 lg:py-[120px]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 sm:px-8 lg:px-[135px]">
          <div className="rounded-3xl bg-neutral-900 p-8 text-white sm:p-10 lg:p-12">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                  The opportunity
                </p>
                <h2 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
                  What you&apos;re joining
                </h2>
                <p className="mt-4 max-w-[520px] text-base leading-7 text-white/75">
                  A network where the company selling a stream in one industry may also be sourcing a feedstock in another.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {opportunityItems.map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/8 p-5 ring-1 ring-white/10">
                    <item.icon className="mb-4 size-5 text-white" />
                    <h3 className="mb-3 text-base font-bold text-white">{item.title}</h3>
                    <p className="text-sm leading-6 text-white/70">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Consulting */}
          <div className="flex flex-col gap-8 rounded-2xl bg-white p-10" style={{ border: "1px solid #E0E0E0" }}>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">Consulting Services</h2>
            <p className="text-base text-neutral-700">Companies new to circular economy, those with complex waste streams, or those ready to unlock new revenue. We assess your waste streams, identify which ones have real market value, and build the business strategy to turn them into income.</p>
            <div className="h-[240px] overflow-hidden rounded-xl bg-neutral-100">
              <img
                src="/images/services-consulting.png"
                alt="Circular economy consulting for industrial waste streams"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h3 className="mb-4 text-lg font-bold text-neutral-900">What We Do:</h3>
              <div className="flex flex-col gap-4">
                {consultingFeatures.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <f.icon className="mt-0.5 size-5 shrink-0 text-neutral-700" />
                    <p className="text-sm text-neutral-700">{f.title}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-base font-bold text-neutral-900">Our Approach:</h3>
              <p className="mb-4 text-sm text-neutral-700">A structured methodology that de-risks your transition to circular operations and ensures long-term success.</p>
              <Link href="/contact">
                <Button variant="primary" size="md">Schedule a Discovery Call</Button>
              </Link>
            </div>
          </div>

          {/* Marketplace */}
          <div className="flex flex-col gap-8 rounded-2xl bg-white p-10" style={{ border: "1px solid #E0E0E0" }}>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">Marketplace Access</h2>
            <p className="text-base text-neutral-700">For companies ready to transact. Vetted counterparties, integrated logistics, escrow payments, carbon tracking, and live pricing.</p>
            <div className="h-[240px] overflow-hidden rounded-xl bg-neutral-100">
              <img
                src="/images/services-marketplace.png"
                alt="Verified marketplace access for industrial feedstocks"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h3 className="mb-4 text-lg font-bold text-neutral-900">What You Get:</h3>
              <div className="flex flex-col gap-4">
                {marketplaceFeatures.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <f.icon className="mt-0.5 size-5 shrink-0 text-neutral-700" />
                    <p className="text-sm text-neutral-700">{f.title}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-base font-bold text-neutral-900">Getting Started:</h3>
              <p className="mb-4 text-sm text-neutral-700">Create your account, build your profile, and start transacting — all in minutes.</p>
              <Link href="/register">
                <Button variant="primary" size="md">Join the Marketplace</Button>
              </Link>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Decision guide */}
      <section className="bg-neutral-100 py-12 lg:py-[100px]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Not Sure Which Path Is<br />Right for You?</h2>
            <p className="text-base text-neutral-700">Include a simple decision guide below the two pathways to help users self-select:</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
            <div>
              <h3 className="mb-6 text-lg font-bold text-neutral-900">Choose Consulting if...</h3>
              <ul className="flex flex-col gap-3">
                {consultingPath.map((item) => (
                  <li key={item} className="text-sm text-neutral-700">• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-6 text-lg font-bold text-neutral-900">Choose Marketplace if...</h3>
              <ul className="flex flex-col gap-3">
                {marketplacePath.map((item) => (
                  <li key={item} className="text-sm text-neutral-700">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why EcoGlobe */}
      <section className="py-16 lg:py-[120px]">
        <div className="mx-auto flex flex-col lg:flex-row max-w-[1440px] gap-8 lg:gap-16 px-4 sm:px-8 lg:px-[135px]">
          <div className="flex-1">
            <h2 className="mb-4 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Why EcoGlobe?</h2>
            <p className="mb-10 text-base text-neutral-700">Include a simple decision guide below the two pathways to help users self-select:</p>
            <div className="flex flex-col gap-6">
              {whyEcoGlobe.map((item) => (
                <div key={item.text} className="flex gap-4">
                  <item.icon className="mt-1 size-5 shrink-0 text-neutral-700" />
                  <p className="text-sm leading-6 text-neutral-700">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[250px] sm:h-[350px] w-full lg:w-[450px] shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            <img
              src="/images/services-marketplace.png"
              alt="EcoGlobe marketplace operations"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <CTABannerSection />
      <Footer />
    </main>
  );
}
