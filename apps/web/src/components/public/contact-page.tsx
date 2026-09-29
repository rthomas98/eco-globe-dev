"use client";

import { useState } from "react";
import { Mail, MapPin, PhoneCall, CheckCircle } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import { submitContactInquiry } from "@/lib/api-contact";
import { Header } from "./header";
import { CTABannerSection } from "./cta-banner-section";
import { Footer } from "./footer";

const CONTACT_EMAIL_DISPLAY = "info@ecoglobeworld.com";

const contactInfo = [
  {
    icon: Mail,
    title: "Email Address",
    value: CONTACT_EMAIL_DISPLAY,
    color: "#96794A",
  },
  {
    icon: PhoneCall,
    title: "Phone",
    value: "Available by appointment after inquiry",
    color: "#96794A",
  },
  {
    icon: MapPin,
    title: "Location",
    value: "9634 Airline Hwy Suite F3, Baton\nRouge, LA 70815, USA",
    color: "#96794A",
  },
];

const CONTACT_EMAIL = CONTACT_EMAIL_DISPLAY;

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Message sent" is shown only after the backend stores the inquiry.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const field = (name: string) => String(data.get(name) ?? "").trim();
    setSending(true);
    setError(null);
    try {
      await submitContactInquiry({
        name: field("name"),
        email: field("email"),
        company: field("company") || undefined,
        topic: field("topic") || undefined,
        message: field("message"),
      });
      form.reset();
      setSubmitted(true);
    } catch (err) {
      setError(
        isBackendApiError(err) && (err.kind === "not-found" || err.kind === "network")
          ? `Online messages are not available right now. Please email ${CONTACT_EMAIL} instead.`
          : describeBackendError(err, `Your message was not sent. Please try again or email ${CONTACT_EMAIL}.`),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="pt-24 lg:pt-32 pb-16 lg:pb-[120px]">
        <div className="mx-auto flex flex-col lg:flex-row max-w-[1440px] gap-8 lg:gap-16 px-4 sm:px-8 lg:px-[135px]">
          {/* Left - Contact info */}
          <div className="w-full lg:w-[340px] shrink-0">
            <h1 className="mb-4 text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">Get in Touch</h1>
            <p className="mb-12 text-base leading-7 text-neutral-700">
              Have a question about us? Our team is here to help and will get back to you as soon as possible.
            </p>

            <div className="flex flex-col gap-8">
              {contactInfo.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="size-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">{item.title}</h3>
                    <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Contact form */}
          <div className="flex-1">
            <div
              className="rounded-2xl bg-white p-6 sm:p-10"
              style={{ boxShadow: "0 8px 32px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)" }}
            >
              {submitted ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="size-7 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900">Message received</h2>
                  <p className="max-w-[420px] text-sm text-neutral-700">
                    Thanks — your message was saved and the EcoGlobe team will reply to the email
                    address you provided.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="mb-8 text-2xl font-bold text-neutral-900">Send us a message</h2>

                  <form className="flex flex-col gap-6" onSubmit={(e) => void handleSubmit(e)}>
                    {/* Row 1: Name + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="contact-name" className="text-sm font-medium text-neutral-900">Name</label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          required
                          className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                          style={{ border: "1px solid #E0E0E0" }}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="contact-email" className="text-sm font-medium text-neutral-900">Email address</label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          required
                          className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                          style={{ border: "1px solid #E0E0E0" }}
                        />
                      </div>
                    </div>

                    {/* Row 2: Company */}
                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="contact-company" className="text-sm font-medium text-neutral-900">Company</label>
                        <input
                          id="contact-company"
                          name="company"
                          type="text"
                          className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                          style={{ border: "1px solid #E0E0E0" }}
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="contact-topic" className="text-sm font-medium text-neutral-900">Topic</label>
                      <input
                        id="contact-topic"
                        name="topic"
                        type="text"
                        className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                        style={{ border: "1px solid #E0E0E0" }}
                      />
                    </div>

                    {/* Message */}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="contact-message" className="text-sm font-medium text-neutral-900">Message</label>
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        rows={5}
                        className="w-full resize-y rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                        style={{ border: "1px solid #E0E0E0" }}
                      />
                    </div>

                    {error && (
                      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </p>
                    )}
                    <Button variant="primary" size="lg" className="w-full" type="submit" disabled={sending}>
                      {sending ? "Sending…" : "Submit"}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <CTABannerSection />
      <Footer />
    </main>
  );
}
