import Link from "next/link";
import Image from "next/image";

type FooterLink = { label: string; href: string };

function FooterSection({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-lg font-semibold leading-7 text-white">{title}</h4>
      <div className="h-px w-full bg-neutral-700" />
      <div className="flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-base leading-6 text-neutral-300 transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-neutral-900 py-16 lg:pt-[120px] lg:pb-[60px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
        <div className="flex flex-col gap-8 lg:gap-[60px]">
          {/* Main content */}
          <div className="flex flex-col md:flex-row gap-8 lg:gap-[60px]">
            {/* Logo and social */}
            <div className="flex w-full md:w-[240px] shrink-0 flex-col gap-12">
              <Link href="/">
                <Image
                  src="/logo.svg"
                  alt="EcoGlobe"
                  width={165}
                  height={48}
                  className="brightness-0 invert"
                />
              </Link>
              <div className="flex gap-6">
                <a href="https://www.linkedin.com/company/ecoglobeworld" target="_blank" rel="noopener" aria-label="LinkedIn" className="flex size-8 items-center justify-center rounded-full bg-neutral-700 transition-colors hover:bg-neutral-600">
                  <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" target="_blank" rel="noopener" aria-label="Instagram" className="flex size-8 items-center justify-center rounded-full bg-neutral-700 transition-colors hover:bg-neutral-600">
                  <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
                <a href="#" target="_blank" rel="noopener" aria-label="Facebook" className="flex size-8 items-center justify-center rounded-full bg-neutral-700 transition-colors hover:bg-neutral-600">
                  <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Link columns - 2 row layout matching Figma */}
            <div className="flex flex-1 flex-col gap-8 lg:gap-[60px]">
              {/* Row 1: Buyers, Company, Other services */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-x-[60px]">
                <FooterSection
                  title="Buyers"
                  links={[
                    { label: "Browse feedstocks", href: "/browse" },
                    { label: "Search by specs, volume & Carbon footprint", href: "/browse" },
                    { label: "Request quotes", href: "/register" },
                    { label: "Track orders & delivery", href: "/buyer/orders" },
                    { label: "Sustainability reports", href: "/sustainability-reports" },
                  ]}
                />
                <FooterSection
                  title="Company"
                  links={[
                    { label: "About us", href: "/about" },
                    { label: "Contact us", href: "/contact" },
                    { label: "Careers", href: "/careers" },
                    { label: "FAQs", href: "/faqs" },
                    { label: "Help Center", href: "/help" },
                    { label: "Newsletter", href: "/newsletter" },
                  ]}
                />
                <FooterSection
                  title="Other services"
                  links={[
                    { label: "Consulting Services", href: "/services" },
                    { label: "Feedstocks certifications", href: "/certifications" },
                    { label: "Other digital Products", href: "/digital-products" },
                    { label: "Logistics", href: "/logistics" },
                  ]}
                />
              </div>

              {/* Row 2: Sellers, Legal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-x-[60px]">
                <FooterSection
                  title="Sellers"
                  links={[
                    { label: "List your feedstock", href: "/register" },
                    { label: "Manage availability & pricing", href: "/seller/listings" },
                    { label: "Reach verified buyers", href: "/register" },
                    { label: "Product passports", href: "/product-passports" },
                    { label: "Get paid securely", href: "/secure-payments" },
                  ]}
                />
                <FooterSection
                  title="Legal"
                  links={[
                    { label: "Terms of service", href: "/terms" },
                    { label: "Privacy policy", href: "/privacy" },
                    { label: "Cookie policy", href: "/cookie-policy" },
                    { label: "Data protection", href: "/data-protection" },
                    { label: "Feedstock policy and protection", href: "/feedstock-policy" },
                    { label: "Logistics policy", href: "/logistics-policy" },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-neutral-700" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
            <p>&copy; 2026 EcoGlobe All rights reserved.</p>
            <p>From Louisiana to the World</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
