import { Button } from "@eco-globe/ui";

export function BuyersSellersSection() {
  return (
    <section className="bg-neutral-100 py-[120px]">
      <div className="mx-auto max-w-[1440px] px-[135px]">
        <div className="grid grid-cols-2 gap-[30px]">
          {/* For Buyers */}
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <h2 className="text-5xl font-bold text-heading">For Buyers</h2>
                <p className="max-w-[470px] text-lg leading-7 text-neutral-800">
                  Find the exact feedstocks you need from local suppliers you can
                  trust. EcoGlobe provides transparent sourcing and reliable
                  delivery.
                </p>
              </div>
              <Button variant="secondary" size="md" className="w-fit">
                Become a Buyer
              </Button>
            </div>
            <div className="h-[320px] overflow-hidden rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80"
                alt="Business professionals shaking hands"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* For Sellers */}
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <h2 className="text-5xl font-bold text-heading">For Sellers</h2>
                <p className="max-w-[470px] text-lg leading-7 text-neutral-800">
                  Unlock the potential of your surplus materials and transform them
                  into a reliable source of revenue by connecting with industries
                  in need.
                </p>
              </div>
              <Button variant="secondary" size="md" className="w-fit">
                Become a Seller
              </Button>
            </div>
            <div className="h-[320px] overflow-hidden rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80"
                alt="Agricultural grain silos"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
