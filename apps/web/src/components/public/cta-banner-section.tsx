import { Button } from "@eco-globe/ui";

export function CTABannerSection() {
  return (
    <section className="relative overflow-hidden bg-neutral-800 py-[120px]">
      <img
        src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/80 to-neutral-900/70" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-[135px]">
        <div className="mx-auto max-w-[870px]">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-6 text-white">
              <h2 className="text-[56px] font-bold leading-tight">
                Everything you need to source and deliver feedstocks
              </h2>
              <p className="text-lg leading-7">
                From discovery to delivery, managed in one system.
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="white" size="lg">
                Explore Listings
              </Button>
              <Button variant="outline-white" size="lg">
                Join as a Seller
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
