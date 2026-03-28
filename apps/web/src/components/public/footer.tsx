import Link from "next/link";

const footerColumns = [
  {
    title: "Buyers",
    links: [
      "Browse feedstock",
      "Search by specs & CO\u2082",
      "Request quotes",
      "Track orders & delivery",
      "Sustainability reports",
    ],
  },
  {
    title: "Sellers",
    links: [
      "List your feedstock",
      "Manage availability & pricing",
      "Reach verified buyers",
      "Product passports",
      "Get paid securely",
    ],
  },
  {
    title: "Company",
    links: ["About", "Contact Us", "Careers", "FAQs", "Help Center", "Newsletter"],
  },
  {
    title: "Legal",
    links: [
      "Terms of service",
      "Privacy policy",
      "Cookie policy",
      "Data protection",
    ],
  },
  {
    title: "Other services",
    links: [
      "Consulting Services",
      "Feedstocks certifications",
      "Other digital Products",
      "Logistics",
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-neutral-900 pt-[120px] pb-[60px]">
      <div className="mx-auto max-w-[1440px] px-[135px]">
        <div className="flex flex-col gap-[60px]">
          <div className="flex gap-[30px]">
            {/* Logo and social */}
            <div className="flex w-[270px] shrink-0 flex-col gap-12">
              <Link href="/" className="text-2xl font-bold">
                <span className="text-white">eco</span>
                <span className="text-green-400">globe</span>
              </Link>
              <div className="flex gap-6">
                <div className="size-8 rounded-full bg-neutral-700" />
                <div className="size-8 rounded-full bg-neutral-700" />
                <div className="size-8 rounded-full bg-neutral-700" />
              </div>
            </div>

            {/* Link columns */}
            <div className="grid flex-1 grid-cols-5 gap-x-6">
              {footerColumns.map((col) => (
                <div key={col.title} className="flex flex-col gap-4">
                  <h4 className="text-lg font-semibold leading-7 text-white">
                    {col.title}
                  </h4>
                  <div className="h-px w-full bg-neutral-700" />
                  <div className="flex flex-col gap-3">
                    {col.links.map((link) => (
                      <Link
                        key={link}
                        href="#"
                        className="text-sm leading-5 text-neutral-200 transition-colors hover:text-white"
                      >
                        {link}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-neutral-700" />

          <div className="flex items-center justify-between text-sm text-neutral-500">
            <p>&copy; 2026 EcoGlobe All rights reserved.</p>
            <p>From Louisiana to the World</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
