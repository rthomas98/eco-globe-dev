import { Header } from "./header";
import { Footer } from "./footer";

interface Props {
  title: string;
  intro: string;
}

export function LegalPage({ title, intro }: Props) {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="pt-24 lg:pt-32 pb-16 lg:pb-[120px]">
        <div className="mx-auto max-w-[800px] px-4 sm:px-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider" style={{ color: "#96794A" }}>
            Last updated April 2026
          </p>
          <h1 className="mb-6 text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-neutral-900">
            {title}
          </h1>
          <p className="text-base leading-7 text-neutral-700">{intro}</p>
          <p className="mt-6 text-base leading-7 text-neutral-700">
            Full policy coming soon. Questions? Email{" "}
            <a
              href="mailto:info@ecoglobeworld.com"
              className="font-medium text-neutral-900 underline underline-offset-2"
            >
              info@ecoglobeworld.com
            </a>
            .
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
