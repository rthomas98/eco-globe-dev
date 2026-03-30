import { Header } from "./header";
import { CTABannerSection } from "./cta-banner-section";
import { Footer } from "./footer";

export function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero - no dark overlay, clean editorial layout */}
      <section className="pt-32 pb-16">
        <div className="mx-auto max-w-[1440px] px-[135px]">
          <div className="flex items-start gap-16">
            <h1 className="max-w-[400px] text-5xl font-bold leading-tight text-neutral-900">
              Building a More Transparent Global Supply Chain
            </h1>
            <p className="max-w-[450px] pt-4 text-base leading-7 text-neutral-700">
              Transparency is even more complicated at the end of life of the feedstocks than general trade. Waste management is a business that lacks of transparency regarless of the location.
            </p>
          </div>
        </div>
      </section>

      {/* Full-width image */}
      <section className="px-[135px]">
        <div className="mx-auto max-w-[1440px]">
          <div className="h-[400px] overflow-hidden rounded-2xl">
            <img src="/images/hero-aerial.png" alt="EcoGlobe facility aerial view" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-[100px]">
        <div className="mx-auto max-w-[1440px] px-[135px]">
          <div className="flex gap-16">
            <h2 className="w-[300px] shrink-0 text-4xl font-bold text-neutral-900">Our mission</h2>
            <div className="flex flex-col gap-6">
              <p className="text-base leading-7 text-neutral-700">
                EcoGlobe delivers secure, scalable feedstock solutions tailored to industrial demands.
              </p>
              <p className="text-base leading-7 text-neutral-700">
                We connect ecosystems to convert byproducts into valuable resources, reducing costs and emissions while enabling new business models and partnerships.
              </p>

              {/* Quote */}
              <div className="mt-4 flex gap-4" style={{ borderLeft: "3px solid #96794A", paddingLeft: "24px" }}>
                <div>
                  <p className="text-base italic leading-7 text-neutral-900">
                    &ldquo;We are committed to transparency, sustainability verification, and responsible sourcing — ensuring ethical trade practices and long-term value for businesses worldwide.&rdquo;
                  </p>
                  <p className="mt-4">
                    <span className="text-sm font-bold text-neutral-900">John Doe</span>
                    <span className="ml-2 text-sm text-neutral-500">Founder & CEO</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTABannerSection />
      <Footer />
    </main>
  );
}
