import Link from "next/link";
import { Button } from "@eco-globe/ui";

export function BuyersSellersSection() {
  return (
    <section className="bg-neutral-100 py-16 lg:py-[120px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-[30px]">
          {/* For Buyers */}
          <div className="grid h-full grid-rows-[auto_220px] gap-8 md:grid-rows-[240px_280px] lg:grid-rows-[260px_320px] lg:gap-12">
            <div className="flex min-h-[220px] flex-col justify-between gap-6 md:min-h-0 lg:gap-8">
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-heading">For Buyers</h2>
                <p className="max-w-[470px] text-base lg:text-lg leading-7 text-neutral-800">
                  EcoGlobe enables cheaper and more sustainable feedstock in a reliable way.
                </p>
                <p className="text-sm font-medium text-neutral-700">
                  Are you both a seller and a buyer?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-heading underline underline-offset-4 hover:text-neutral-700"
                  >
                    Click here
                  </Link>
                  .
                </p>
              </div>
              <Link href="/register" className="w-fit">
                <Button variant="secondary" size="md">
                  Become a Buyer
                </Button>
              </Link>
            </div>
            <div className="h-full overflow-hidden rounded-2xl">
              <img
                src="/images/home-buyers.png"
                alt="Buyer-side feedstock sourcing review"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* For Sellers */}
          <div className="grid h-full grid-rows-[auto_220px] gap-8 md:grid-rows-[240px_280px] lg:grid-rows-[260px_320px] lg:gap-12">
            <div className="flex min-h-[220px] flex-col justify-between gap-6 md:min-h-0 lg:gap-8">
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-heading">For Sellers</h2>
                <p className="max-w-[470px] text-base lg:text-lg leading-7 text-neutral-800">
                  Unlock the potential of your surplus materials and transform them
                  into a reliable source of revenue by connecting with industries
                  in need.
                </p>
              </div>
              <Link href="/register" className="w-fit">
                <Button variant="secondary" size="md">
                  Become a Seller
                </Button>
              </Link>
            </div>
            <div className="h-full overflow-hidden rounded-2xl">
              <img
                src="/images/home-sellers.png"
                alt="Seller-side industrial materials yard"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
