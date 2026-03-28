import { Button } from "@eco-globe/ui";

export function CTABannerSection() {
  return (
    <section className="bg-neutral-800 py-[120px]">
      <div className="mx-auto max-w-[1440px] px-[135px]">
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
