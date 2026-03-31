import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { Header } from "./header";
import { CTABannerSection } from "./cta-banner-section";
import { Footer } from "./footer";

const contactInfo = [
  {
    icon: Mail,
    title: "Email Address",
    value: "help@firearmfrontier.com",
    color: "#96794A",
  },
  {
    icon: Phone,
    title: "Phone Number",
    value: "225-000-0000",
    color: "#96794A",
  },
  {
    icon: MapPin,
    title: "Location",
    value: "9634 Airline Hwy Suite F3, Baton\nRouge, LA 70815, USA",
    color: "#96794A",
  },
];

export function ContactPage() {
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
              className="rounded-2xl bg-white p-10"
              style={{ boxShadow: "0 8px 32px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)" }}
            >
              <h2 className="mb-8 text-2xl font-bold text-neutral-900">Send us a message</h2>

              <form className="flex flex-col gap-6">
                {/* Row 1: Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-900">Name</label>
                    <input
                      type="text"
                      placeholder="Input field"
                      className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                      style={{ border: "1px solid #E0E0E0" }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-900">Email address</label>
                    <input
                      type="email"
                      placeholder="Input field"
                      className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                      style={{ border: "1px solid #E0E0E0" }}
                    />
                  </div>
                </div>

                {/* Row 2: Company + Job title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-900">Company</label>
                    <input
                      type="text"
                      placeholder="Input field"
                      className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                      style={{ border: "1px solid #E0E0E0" }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-900">Job title</label>
                    <input
                      type="text"
                      placeholder="Input field"
                      className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                      style={{ border: "1px solid #E0E0E0" }}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-neutral-900">Subject</label>
                  <input
                    type="text"
                    placeholder="Input field"
                    className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                    style={{ border: "1px solid #E0E0E0" }}
                  />
                </div>

                {/* Message */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-neutral-900">Message</label>
                  <textarea
                    placeholder="Enter your message..."
                    rows={5}
                    className="w-full resize-y rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                    style={{ border: "1px solid #E0E0E0" }}
                  />
                </div>

                <Button variant="primary" size="lg" className="w-full">
                  Submit
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <CTABannerSection />
      <Footer />
    </main>
  );
}
