import Link from "next/link";
import { Button, Badge } from "@eco-globe/ui";

interface Listing {
  id: string;
  title: string;
  location: string;
  moq: string;
  price: string;
  currency: string;
  unit: string;
  image: string;
}

const listings: Listing[] = [
  {
    id: "bagasse",
    title: "Shredded, Refined Sugar Bagasse",
    location: "Port Allen, Louisiana",
    moq: "3 tons",
    price: "$48",
    currency: "$",
    unit: "/ton",
    image: "/products/generated/bagasse.png",
  },
  {
    id: "polymer",
    title: "Scrap Polymer Blend with Impurities",
    location: "Houston, Texas",
    moq: "2.5 tons",
    price: "€60",
    currency: "€",
    unit: "/ton",
    image: "/products/generated/polymer.png",
  },
  {
    id: "pyrolysis",
    title: "Pyrolysis Pitch",
    location: "Cadiz, Spain",
    moq: "1 tons",
    price: "$400",
    currency: "$",
    unit: "/ton",
    image: "/products/generated/pyrolysis.png",
  },
  {
    id: "stover-walker",
    title: "Harvested and Baled Corn Stover",
    location: "Rotterdam, Netherlands",
    moq: "10 tons",
    price: "$42",
    currency: "$",
    unit: "/ton",
    image: "/products/generated/stover-walker.png",
  },
  {
    id: "used-dry-transformer",
    title: "Used Dry Transformer",
    location: "Houston, Texas",
    moq: "1 unit",
    price: "$800",
    currency: "$",
    unit: "/unit",
    image: "/products/generated/used-dry-transformer.png",
  },
  {
    id: "hydrochar",
    title: "Hydrochar",
    location: "Rotterdam, Netherlands",
    moq: "2 tons",
    price: "€75",
    currency: "€",
    unit: "/ton",
    image: "/products/generated/hydrochar.png",
  },
  {
    id: "used-pallets",
    title: "Used Pallets",
    location: "Denham Springs, Louisiana",
    moq: "1 tons",
    price: "$15",
    currency: "$",
    unit: "/ton",
    image: "/products/generated/used-pallets.png",
  },
  {
    id: "biochar",
    title: "Biochar",
    location: "Guadalajara, Mexico",
    moq: "3 tons",
    price: "$300",
    currency: "$",
    unit: "/ton",
    image: "/products/generated/biochar.png",
  },
  {
    id: "white-label",
    title: "White Label",
    location: "Jubail, Saudi Arabia",
    moq: "5 tons",
    price: "$120",
    currency: "$",
    unit: "/ton",
    image: "/products/generated/white-label.png",
  },
];

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/browse/${listing.id}`}
      className="group flex flex-col gap-3"
    >
      <div className="h-[240px] overflow-hidden rounded-xl">
        <img
          src={listing.image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-medium leading-6 text-neutral-900 group-hover:underline">
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
    </Link>
  );
}

export function FeaturedListingsSection() {
  return (
    <section className="py-16 lg:py-[120px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
        <div className="mb-8 lg:mb-[60px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-heading">
            Featured Listings
          </h2>
          <Link href="/browse">
            <Button variant="secondary" size="md">
              View All Listings
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-x-[30px] lg:gap-y-10">
          {listings.map((listing) => (
            <ListingCard key={listing.title} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
}
