import { Button, Badge } from "@eco-globe/ui";

interface Listing {
  title: string;
  location: string;
  moq: string;
  price: string;
  currency: string;
  unit: string;
}

const listings: Listing[] = [
  {
    title: "Shredded, Refined Sugar Bagasse",
    location: "Port Allen, LA",
    moq: "3 tons",
    price: "$48",
    currency: "$",
    unit: "/ton",
  },
  {
    title: "Scrap Polymer Blend with Impurities",
    location: "Plaquemine, LA",
    moq: "2.5 tons",
    price: "\u20AC60",
    currency: "\u20AC",
    unit: "/ton",
  },
  {
    title: "High-Quality Recycled Pyrolysis Pitch",
    location: "Baker, LA",
    moq: "1 tons",
    price: "$300",
    currency: "$",
    unit: "/ton",
  },
  {
    title: "Harvested and Baled Corn Stover",
    location: "Walker, LA",
    moq: "10 tons",
    price: "$42",
    currency: "$",
    unit: "/ton",
  },
  {
    title: "Premium Recycled Polyester Fiber",
    location: "Gonzales, LA",
    moq: "1.5 tons",
    price: "\u20AC200",
    currency: "\u20AC",
    unit: "/ton",
  },
  {
    title: "High-Carbon Activated Hidrochar",
    location: "Sweden Pulp & Paper manufacturer",
    moq: "2 tons",
    price: "\u20AC75",
    currency: "\u20AC",
    unit: "/ton",
  },
  {
    title: "Heat Treated Recycled Pallets",
    location: "Denham Springs, LA",
    moq: "1 tons",
    price: "$55",
    currency: "$",
    unit: "/ton",
  },
  {
    title: "Sustainably Sourced Biochar",
    location: "Zachary, LA",
    moq: "3 tons",
    price: "$55",
    currency: "$",
    unit: "/ton",
  },
];

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="flex cursor-pointer flex-col gap-3">
      <div className="h-[240px] overflow-hidden rounded-xl bg-neutral-200 transition-transform duration-300 hover:scale-[1.02]" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-medium leading-6 text-neutral-900">
            {listing.title}
          </p>
          <p className="text-sm text-neutral-800">{listing.location}</p>
          <Badge className="w-fit">MOQ: {listing.moq}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-semibold text-neutral-900">
            {listing.price}
          </span>
          <span className="text-sm text-neutral-700">{listing.unit}</span>
        </div>
      </div>
    </div>
  );
}

export function FeaturedListingsSection() {
  return (
    <section className="py-[120px]">
      <div className="mx-auto max-w-[1440px] px-[135px]">
        <div className="mb-[60px] flex items-center justify-between">
          <h2 className="text-5xl font-bold text-heading">
            Featured Listings
          </h2>
          <Button variant="secondary" size="md">
            View All Listings
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-x-[30px] gap-y-10">
          {listings.map((listing) => (
            <ListingCard key={listing.title} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
}
