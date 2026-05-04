"use client";

import { useState } from "react";
import { CheckCircle, Mail } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { Header } from "./header";
import { Footer } from "./footer";
import { CTABannerSection } from "./cta-banner-section";

export function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="pt-24 pb-12 lg:pt-32 lg:pb-16">
        <div className="mx-auto max-w-[640px] px-4 sm:px-8 text-center">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white">
            <Mail className="size-7" />
          </div>
          <p
            className="mb-3 text-sm font-medium uppercase tracking-wider"
            style={{ color: "#96794A" }}
          >
            Newsletter
          </p>
          <h1 className="mb-4 text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-neutral-900">
            One email a month, no spam.
          </h1>
          <p className="mb-8 text-base leading-7 text-neutral-700">
            New feedstocks coming online, market-price snapshots from our
            verified network, and product updates worth noticing. Unsubscribe
            in one click.
          </p>

          {submitted ? (
            <div className="mx-auto flex max-w-[420px] flex-col items-center gap-3 rounded-2xl bg-green-50 p-8" style={{ border: "1px solid #BBF7D0" }}>
              <CheckCircle className="size-8 text-green-600" />
              <p className="text-base font-bold text-neutral-900">
                You&apos;re on the list
              </p>
              <p className="text-sm text-neutral-700">
                We&apos;ll send your first issue within a couple of weeks.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-[480px] flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 rounded-full bg-white px-5 py-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
                style={{ border: "1px solid #E0E0E0" }}
              />
              <Button variant="primary" size="md">
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </section>
      <CTABannerSection />
      <Footer />
    </main>
  );
}
