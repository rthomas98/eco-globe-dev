import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SoonPill } from "./soon-pill";
import { FEEDSTOCK_IQ } from "./feedstock-iq-copy";

/** Inline coming-soon prompt for empty searches and the listing pricing step. */
export function FeedstockIqPrompt({ context }: { context: "search" | "pricing" }) {
  return (
    <div
      className="flex w-full max-w-[480px] items-start gap-3 rounded-xl bg-white p-4 text-left text-sm"
      style={{ border: "1px solid #E0E0E0" }}
    >
      <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
      <div>
        <p className="font-semibold text-neutral-900">
          {FEEDSTOCK_IQ.name}
          <SoonPill />
        </p>
        <p className="mt-1 text-neutral-600">{FEEDSTOCK_IQ.prompts[context]}</p>
        <Link href={FEEDSTOCK_IQ.href} className="mt-2 inline-block font-semibold text-neutral-900 underline">
          Learn about Feedstock IQ
        </Link>
      </div>
    </div>
  );
}

/** Dashboard card announcing Feedstock IQ. */
export function FeedstockIqCard() {
  return (
    <Link
      href={FEEDSTOCK_IQ.href}
      className="flex items-start gap-3 rounded-xl bg-white p-5 transition-shadow hover:shadow-md"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
        <Sparkles className="size-5 text-amber-700" aria-hidden="true" />
      </span>
      <span>
        <span className="flex items-center text-sm font-bold text-neutral-900">
          {FEEDSTOCK_IQ.name}
          <SoonPill />
        </span>
        <span className="mt-1 block text-sm text-neutral-600">{FEEDSTOCK_IQ.prompts.dashboard}</span>
      </span>
    </Link>
  );
}
