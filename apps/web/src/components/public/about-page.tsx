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
              Waste-streams or wasted industrial byproducts are undervalued, sent to the waste manager for expensive disposing costs. EcoGlobe changes that — turning what your operation discards into a measurable revenue stream, through a verified marketplace built for the circular economy.
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
                EcoGlobe delivers secure, scalable feedstock solutions tailored to industrial demands.
              </p>
              <p className="text-base leading-7 text-neutral-700">
                We connect ecosystems to convert byproducts into valuable resources, reducing costs and emissions while creating new revenue opportunities for businesses on both sides of the trade.
              </p>

              {/* Quote */}
              <div className="mt-4 flex gap-4" style={{ borderLeft: "3px solid #96794A", paddingLeft: "24px" }}>
                <div>
                  <p className="text-base italic leading-7 text-neutral-900">
                    &ldquo;We built EcoGlobe because wasted industrial byproducts deserve a real market. Our goal is simple: help suppliers generate revenue from what they discard, and give buyers verified sources they can build their operations around.&rdquo;
                  </p>
                  <p className="mt-4">
                    <span className="text-sm font-bold text-neutral-900">Ana Sanz and Bea Roberts</span>
                    <span className="ml-2 text-sm text-neutral-500">EcoGlobe&rsquo;s Co-Founders</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-neutral-100 py-12 lg:py-[100px]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
          <div className="mb-10 flex flex-col gap-3">
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: "#96794A" }}>
              Meet the team
            </p>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
              The people behind EcoGlobe
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {[
              { initial: "A", name: "Ana Sanz", title: "Co-Founder" },
              { initial: "B", name: "Bea Roberts", title: "Co-Founder" },
            ].map((member) => (
              <div
                key={member.name}
                className="flex items-center gap-6 rounded-2xl bg-white p-8"
                style={{ border: "1px solid #E0E0E0" }}
              >
                <div
                  className="flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-neutral-700"
                  style={{ backgroundColor: "#F5F5F5" }}
                >
                  {member.initial}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">{member.name}</h3>
                  <p className="text-sm text-neutral-500">{member.title}</p>
                  <p className="mt-2 text-sm text-neutral-700">Bio coming soon.</p>
                </div>
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
