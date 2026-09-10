"use client";
import { useEffect, useRef } from "react";
import { SampleShippingCheckout } from "./sample-shipping-checkout";
import type { LabTestingListingContext } from "@/components/lab-testing/lab-testing-form";
export function RequestSampleModal({
  listing,
  onClose,
}: {
  listing: LabTestingListingContext;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Request a sample"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#f5f6f6]"
    >
      <button
        onClick={onClose}
        className="sticky top-3 z-10 ml-4 rounded-full border bg-white px-5 py-2"
      >
        Close sample checkout
      </button>
      <SampleShippingCheckout listingId={listing.id} />
    </div>
  );
}
