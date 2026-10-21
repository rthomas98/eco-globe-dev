"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Lock } from "lucide-react";
import { useDemoUser } from "@/lib/demo-user";
import { switchBackendRoleForCompany } from "@/lib/backend-auth";
import {
  DRAFT_SHORTCUT_HREF,
  companyDraftShortcuts,
  needsRoleSwitch,
  type DraftShortcutRole,
} from "@/lib/company-draft-shortcuts";

const ACTION_LABEL: Record<DraftShortcutRole, string> = {
  buyer: "Buyer RFQ drafts",
  seller: "Seller listing drafts",
};

/**
 * Browse entry point to the active company's private drafts. Drafts stay on
 * the existing company-scoped buyer RFQ and seller listing screens; nothing
 * here lists or counts them, so Browse inventory never includes them.
 * Hidden when signed out or without an eligible active membership.
 */
export function CompanyDraftShortcuts() {
  const user = useDemoUser();
  const router = useRouter();
  const shortcuts = companyDraftShortcuts(user);
  const switchingRef = useRef(false);
  const [switching, setSwitching] = useState<DraftShortcutRole | null>(null);
  const [error, setError] = useState("");

  if (!user || !shortcuts) return null;

  const openDrafts = async (target: DraftShortcutRole) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    setSwitching(target);
    setError("");
    try {
      // Throws, without writing the client session, unless the server kept this company in the target role.
      await switchBackendRoleForCompany(target, shortcuts.companyId);
      // Stay locked while the route changes so a second click can't start another switch.
      router.push(DRAFT_SHORTCUT_HREF[target]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open your drafts. Please try again.");
      switchingRef.current = false;
      setSwitching(null);
    }
  };

  const actionClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold sm:w-auto";
  const targets = (["buyer", "seller"] as const).filter((target) => shortcuts[target]);

  return (
    <section
      aria-labelledby="company-drafts-heading"
      className="mb-4 rounded-xl bg-amber-50 p-4 sm:p-5"
      style={{ border: "1px solid #FDE68A" }}
    >
      <h2 id="company-drafts-heading" className="flex items-center gap-2 text-base font-bold text-neutral-900">
        <Lock className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
        Your company&apos;s demo drafts
      </h2>
      <p className="mt-1 text-sm text-neutral-700">
        Private source drafts for <span className="font-semibold text-neutral-900">{shortcuts.companyName}</span>,
        for your team to review and edit. Only your company can see them; they are separate from the listings
        below. Public demo examples are available separately in Demo feedstocks.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {targets.map((target, index) => {
          const tone = index === 0 ? "bg-neutral-900 text-white" : "bg-white text-neutral-900";
          const border = index === 0 ? undefined : { border: "1px solid #E0E0E0" };
          if (!needsRoleSwitch(user.role, target)) {
            // While the other action is switching roles, this link must not navigate either.
            const locked = switching !== null;
            return (
              <Link
                key={target}
                href={DRAFT_SHORTCUT_HREF[target]}
                aria-disabled={locked || undefined}
                tabIndex={locked ? -1 : undefined}
                onClick={(event) => {
                  if (switchingRef.current) event.preventDefault();
                }}
                className={`${actionClass} ${tone} ${locked ? "pointer-events-none opacity-60" : ""}`}
                style={border}
              >
                <FileText className="size-4" aria-hidden="true" />
                {ACTION_LABEL[target]}
              </Link>
            );
          }
          const busy = switching === target;
          return (
            <button
              key={target}
              type="button"
              onClick={() => openDrafts(target)}
              disabled={switching !== null}
              aria-busy={busy}
              className={`${actionClass} ${tone} disabled:opacity-60`}
              style={border}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileText className="size-4" aria-hidden="true" />
              )}
              {busy ? "Opening drafts…" : ACTION_LABEL[target]}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
