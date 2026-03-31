import { Button } from "@eco-globe/ui";

export function CTABannerSection() {
  return (
    <section className="py-16 lg:py-[120px]" style={{ backgroundColor: "#424242" }}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
        <div className="flex flex-col gap-8 lg:gap-12">
          <div className="flex flex-col gap-4 lg:gap-6 text-white">
            <h2 className="text-2xl sm:text-4xl lg:text-[56px] font-bold leading-tight">
              Everything you need to source and deliver feedstocks
            </h2>
            <p className="text-base lg:text-lg leading-7 text-white/80">
              From discovery to delivery, managed in one system.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="white" size="lg">
              Explore Listings
            </Button>
            <Button variant="outline-white" size="lg">
              Join as a Seller
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
