import Link from "next/link";
import { Button } from "@eco-globe/ui";

export function CTABannerSection() {
  return (
    <section className="py-16 lg:py-[120px]" style={{ backgroundColor: "#424242" }}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
        <div className="flex flex-col gap-8 lg:gap-12">
          <div className="flex flex-col gap-4 lg:gap-6 text-white">
            <h2 className="text-2xl sm:text-4xl lg:text-[56px] font-bold leading-tight">
              One Platform. Every Step of the Trade.
            </h2>
            <p className="text-base lg:text-lg leading-7 text-white/80">
              From finding verified partners to completing transactions — EcoGlobe handles the complexity so you can focus on the deal.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/browse">
              <Button variant="white" size="lg">
                Explore Listings
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline-white" size="lg">
                Join as a Seller
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
