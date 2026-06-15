import { Header } from "./header";
import { CTABannerSection } from "./cta-banner-section";
import { Footer } from "./footer";

export function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero - no dark overlay, clean editorial layout */}
      <section className="pt-24 lg:pt-32 pb-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-16">
            <h1 className="max-w-[400px] text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-neutral-900">
              Where Industrial Waste Becomes a Valued Resource
            </h1>
            <p className="max-w-[450px] pt-4 text-base leading-7 text-neutral-700">
              Industrial byproducts and waste streams have long been undervalued, undertraded, and poorly matched. EcoGlobe changes that — turning what your operation discards into a measurable revenue stream, through a verified marketplace built for the circular economy.
            </p>
          </div>
        </div>
      </section>

      {/* Full-width image */}
      <section className="px-4 sm:px-8 lg:px-[135px]">
        <div className="mx-auto max-w-[1440px]">
          <div className="h-[250px] sm:h-[350px] lg:h-[400px] overflow-hidden rounded-2xl">
            <img src="/images/hero-aerial.png" alt="EcoGlobe facility aerial view" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-12 lg:py-[100px]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
            <h2 className="w-full lg:w-[300px] shrink-0 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Our mission</h2>
            <div className="flex flex-col gap-6">
              <p className="text-base leading-7 text-neutral-700">
                We connect ecosystems to convert byproducts into valuable resources, reducing costs and emissions while creating new revenue opportunities for businesses on both sides of the trade.
              </p>

              {/* Quote */}
              <div className="mt-4 flex gap-4" style={{ borderLeft: "3px solid #96794A", paddingLeft: "24px" }}>
                <div>
                  <p className="text-base italic leading-7 text-neutral-900">
                    &ldquo;We built EcoGlobe because industrial byproducts deserve a real market. Our goal is simple: help suppliers generate revenue from what they discard, and give buyers verified sources they can build their operations around.&rdquo;
                  </p>
                  <p className="mt-4">
                    <span className="text-sm font-bold text-neutral-900">Bea Roberts</span>
                    <span className="ml-2 text-sm text-neutral-500">Co-Founder</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Expertise */}
      <section className="bg-neutral-100 py-12 lg:py-[100px]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
          <div className="mb-10 flex flex-col gap-4 lg:max-w-[760px]">
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: "#96794A" }}>
              Our foundation
            </p>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
              Built on Industry Expertise
            </h2>
            <p className="text-base leading-7 text-neutral-700">
              EcoGlobe is built by people who have spent their careers inside the industries this platform serves.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                title: "Mapping industrial waste streams",
                body: "Hands-on experience inside chemical plants, petrochemical plants, and refineries — identifying, characterizing, and quantifying byproducts at the plant level, and knowing which streams have real market value.",
              },
              {
                title: "Circular economy commercialization",
                body: "Direct experience converting waste streams into revenue, including the technical, regulatory, and economic validation that determines whether a stream finds a buyer or never leaves the site.",
              },
              {
                title: "Cross-industry market access",
                body: "Deep knowledge of how feedstock and byproduct demand moves between sectors — including asphalt, pulp & paper, cement, stainless steel, and other processing plants — which industries need what, what they will and won’t pay for, and why most of this demand never reaches the right supplier today.",
              },
              {
                title: "Trade infrastructure",
                body: "Practical understanding of the compliance, logistics, verification, and payment work that determines whether industrial deals close or collapse — built into the platform from day one.",
              },
            ].map((pillar, i) => (
              <div
                key={pillar.title}
                className="flex flex-col gap-3 rounded-2xl bg-white p-8"
                style={{ border: "1px solid #E0E0E0" }}
              >
                <span className="text-sm font-bold" style={{ color: "#96794A" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-bold text-neutral-900">{pillar.title}</h3>
                <p className="text-sm leading-7 text-neutral-700">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABannerSection />
      <Footer />
    </main>
  );
}
