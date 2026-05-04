"use client";

import { useState } from "react";
import {
  Search,
  Mail,
  MessageCircle,
  ShoppingCart,
  AlertCircle,
  ChevronDown,
  CreditCard,
  Truck,
  UserCircle,
  ScrollText,
  HelpCircle,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";

type Topic = "All" | "Orders" | "Payments" | "Shipping" | "Account";

interface FaqItem {
  topic: Exclude<Topic, "All">;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    topic: "Orders",
    question: "How do I review and approve a shipping quote?",
    answer:
      "Open the order from My Orders. The Quote awaiting approval banner shows the ETA, distance, and shipping cost. Click Approve Quote to move forward, or Request Changes to send the seller a counter.",
  },
  {
    topic: "Orders",
    question: "Can I cancel an order after I've placed it?",
    answer:
      "Yes — open the kebab menu on any active order and choose Cancel order. The seller is notified, and any funded escrow is refunded. Completed orders cannot be cancelled.",
  },
  {
    topic: "Orders",
    question: "How do I confirm delivery?",
    answer:
      "When an order reaches Buyer verification, click Mark as Delivered. Confirm what arrived matches the order, or open Report an Issue to file a dispute.",
  },
  {
    topic: "Payments",
    question: "How does escrow work on EcoGlobe?",
    answer:
      "Once you approve a quote, you fund escrow with a saved payment method. Funds are held until you confirm delivery — at that point escrow is released to the seller. If you report an issue, escrow stays on hold while EcoGlobe reviews.",
  },
  {
    topic: "Payments",
    question: "Where do I add or change my payment method?",
    answer:
      "Go to Accounting → Bank Account. Use Add Bank Account to add a new method, or the kebab menu on any saved account to edit, delete, or set as default.",
  },
  {
    topic: "Payments",
    question: "How do I view past transactions?",
    answer:
      "Accounting → Transactions shows every escrow funding, release, and refund. Click any row to see the full transaction detail, including documents and the activity timeline.",
  },
  {
    topic: "Shipping",
    question: "What's the difference between Pickup and Delivery?",
    answer:
      "Delivery means the seller arranges shipping for an additional cost (you'll see the quote before you commit). Pickup means you arrange transport yourself — the order moves to Ready for pickup with a code you bring to the seller's facility.",
  },
  {
    topic: "Shipping",
    question: "How do I find my pickup code?",
    answer:
      "Open the order from My Orders. When status is Ready for pickup, the pickup code is shown in the banner with copy and share buttons.",
  },
  {
    topic: "Account",
    question: "How do I update my company information?",
    answer:
      "From the user menu in the sidebar (bottom left), choose Company. Updates are saved automatically and used on your billing address by default.",
  },
  {
    topic: "Account",
    question: "I forgot my password — what now?",
    answer:
      "From the login page, click Forgot Password and enter your work email. We'll send you a reset link.",
  },
];

const TOPIC_ICONS: Record<Exclude<Topic, "All">, React.ComponentType<{ className?: string }>> = {
  Orders: ShoppingCart,
  Payments: CreditCard,
  Shipping: Truck,
  Account: UserCircle,
};

const QUICK_ACTIONS = [
  {
    icon: ScrollText,
    title: "Browse FAQs",
    desc: "Common questions answered",
    href: "#faqs",
  },
  {
    icon: ShoppingCart,
    title: "Track an order",
    desc: "Check status and timeline",
    href: "/buyer/orders",
  },
  {
    icon: AlertCircle,
    title: "Open a dispute",
    desc: "Report an issue with delivery",
    href: "/buyer/orders",
  },
  {
    icon: MessageCircle,
    title: "Contact support",
    desc: "Reach our team directly",
    href: "mailto:info@ecoglobeworld.com",
  },
];

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-neutral-900">
          {item.question}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm leading-6 text-neutral-700">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export function BuyerHelpPage() {
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<Topic>("All");

  const topics: Topic[] = ["All", "Orders", "Payments", "Shipping", "Account"];

  const filtered = FAQS.filter((f) => {
    if (topic !== "All" && f.topic !== topic) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !f.question.toLowerCase().includes(q) &&
        !f.answer.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
        {/* Hero */}
        <section className="px-8 pt-10 pb-12">
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-neutral-900 text-white">
              <HelpCircle className="size-6" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
              How can we help?
            </h1>
            <p className="max-w-[520px] text-base text-neutral-600">
              Search the help center or browse common topics. Still stuck? Our
              team replies within one business day.
            </p>
            <div
              className="flex w-full max-w-[560px] items-center gap-3 rounded-full bg-white px-5 py-3"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <Search className="size-5 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles, e.g. 'escrow'"
                className="w-full bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="px-8 pb-10">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((a) => {
              const isExternal = a.href.startsWith("mailto:");
              const Tag = isExternal ? "a" : "a";
              return (
                <Tag
                  key={a.title}
                  href={a.href}
                  className="group flex flex-col gap-3 rounded-2xl bg-white p-6 transition-all hover:shadow-md"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-100 transition-colors group-hover:bg-neutral-900 group-hover:text-white">
                    <a.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-neutral-900">
                      {a.title}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">{a.desc}</p>
                  </div>
                </Tag>
              );
            })}
          </div>
        </section>

        {/* FAQs */}
        <section id="faqs" className="px-8 pb-10">
          <div className="mx-auto max-w-[840px]">
            <div className="mb-6 flex flex-col gap-3">
              <h2 className="text-xl font-bold text-neutral-900">
                Frequently asked questions
              </h2>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => {
                  const Icon = t === "All" ? null : TOPIC_ICONS[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        topic === t
                          ? "bg-neutral-900 text-white"
                          : "bg-white text-neutral-700 hover:bg-neutral-100"
                      }`}
                      style={
                        topic === t ? undefined : { border: "1px solid #E0E0E0" }
                      }
                    >
                      {Icon && <Icon className="size-3.5" />}
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-12 text-center">
                <p className="text-base font-semibold text-neutral-900">
                  No matching articles
                </p>
                <p className="text-sm text-neutral-600">
                  Try a different search or contact our team.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((f) => (
                  <FaqRow key={f.question} item={f} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Still need help */}
        <section className="px-8 pb-12">
          <div className="mx-auto max-w-[840px]">
            <div
              className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center sm:flex-row sm:text-left"
              style={{ border: "1px solid #F0F0F0" }}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
                <Mail className="size-6 text-neutral-700" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-neutral-900">
                  Still need help?
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Email us at{" "}
                  <a
                    href="mailto:info@ecoglobeworld.com"
                    className="font-medium text-neutral-900 underline underline-offset-2"
                  >
                    info@ecoglobeworld.com
                  </a>{" "}
                  and we&apos;ll get back within one business day.
                </p>
              </div>
              <a href="mailto:info@ecoglobeworld.com">
                <Button variant="primary" size="md">
                  Email support
                </Button>
              </a>
            </div>
          </div>
        </section>
      </div>
    </BuyerLayout>
  );
}
