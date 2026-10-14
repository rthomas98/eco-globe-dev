import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

/** Page frame shared by every Market records screen. */
export function MarketRecordShell({
  title,
  description,
  backHref,
  backLabel,
  actions,
  notice,
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  /** Replaces the research-registry notice on related screens (e.g. portfolios). */
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        {backHref && (
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel ?? "Back"}
          </Link>
        )}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-neutral-900 sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-neutral-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {notice ?? <InternalRecordsNotice />}
        {children}
      </div>
    </div>
  );
}

export function InternalRecordsNotice() {
  return (
    <p
      className="mb-6 flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900"
      style={{ border: "1px solid #BAE6FD" }}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Internal research registry. These records are never shown to buyers or sellers and are not
        listings. Volumes are annual capacities or estimates, not available stock. Prices are research
        context, not offers; a negative price is a gate fee the seller pays.
      </span>
    </p>
  );
}
