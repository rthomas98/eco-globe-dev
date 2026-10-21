import Link from "next/link";
import { ChevronRight, Presentation } from "lucide-react";
import { DEMO_PRESENTATIONS_HREF } from "@/lib/demo-presentations";

/** Browse link to the public, presentation-only demo gallery; shown to everyone, signed in or not. */
export function DemoFeedstocksLink() {
  return (
    <Link
      href={DEMO_PRESENTATIONS_HREF}
      className="mb-4 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <span className="flex items-center gap-2">
        <Presentation className="size-4 shrink-0 text-neutral-500" aria-hidden="true" />
        <span>
          <span className="font-semibold text-neutral-900">Explore demo feedstocks</span>
          <span className="block text-xs text-neutral-500 sm:inline sm:before:content-['_·_']">
            Presentation only — not available for purchase
          </span>
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
    </Link>
  );
}
