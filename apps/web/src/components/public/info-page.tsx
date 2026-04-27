import Link from "next/link";
import { Button } from "@eco-globe/ui";
import { Header } from "./header";
import { Footer } from "./footer";
import { CTABannerSection } from "./cta-banner-section";

export interface InfoSection {
  heading: string;
  body: string | string[];
}

interface InfoPageProps {
  eyebrow?: string;
  title: string;
  intro: string;
  sections?: InfoSection[];
  contactEmail?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  children?: React.ReactNode;
  showCTABanner?: boolean;
}

export function InfoPage({
  eyebrow,
  title,
  intro,
  sections,
  contactEmail = true,
  ctaLabel,
  ctaHref,
  children,
  showCTABanner = true,
}: InfoPageProps) {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="pt-24 pb-12 lg:pt-32 lg:pb-16">
        <div className="mx-auto max-w-[840px] px-4 sm:px-8">
          {eyebrow && (
            <p
              className="mb-3 text-sm font-medium uppercase tracking-wider"
              style={{ color: "#96794A" }}
            >
              {eyebrow}
            </p>
          )}
          <h1 className="mb-6 text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-neutral-900">
            {title}
          </h1>
          <p className="text-base leading-7 text-neutral-700">{intro}</p>

          {ctaLabel && ctaHref && (
            <div className="mt-6">
              <Link href={ctaHref}>
                <Button variant="primary" size="md">
                  {ctaLabel}
                </Button>
              </Link>
            </div>
          )}

          {sections && sections.length > 0 && (
            <div className="mt-12 flex flex-col gap-10">
              {sections.map((s) => (
                <div key={s.heading}>
                  <h2 className="mb-3 text-lg font-bold text-neutral-900">
                    {s.heading}
                  </h2>
                  {Array.isArray(s.body) ? (
                    <ul className="flex flex-col gap-2 text-base leading-7 text-neutral-700">
                      {s.body.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neutral-400" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-base leading-7 text-neutral-700">
                      {s.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {children && <div className="mt-12">{children}</div>}

          {contactEmail && (
            <p className="mt-12 text-base leading-7 text-neutral-700">
              Questions? Email{" "}
              <a
                href="mailto:info@ecoglobeworld.com"
                className="font-medium text-neutral-900 underline underline-offset-2"
              >
                info@ecoglobeworld.com
              </a>
              .
            </p>
          )}
        </div>
      </section>
      {showCTABanner && <CTABannerSection />}
      <Footer />
    </main>
  );
}
