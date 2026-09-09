"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { LabTestingForm, type LabTestingFormProps } from "./lab-testing-form";
import { LabTestingWorkspace } from "./lab-testing-guidance";

/**
 * Full-viewport host for the referral form: the workspace (form card plus
 * guidance column) takes the whole screen so the wide layout has room.
 * Focus is trapped inside, Escape closes, and focus returns to the opener.
 */
export function LabTestingDialog({
  onClose,
  ...formProps
}: Omit<LabTestingFormProps, "onCancel" | "headingId" | "autoFocus"> & { onClose: () => void }) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [onClose]);

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/40"
      style={{ border: "1px solid #E0E0E0" }}
      aria-label="Close lab testing request"
    >
      <X className="size-5" aria-hidden="true" />
    </button>
  );

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#F4F5F6]"
    >
      <LabTestingWorkspace actions={closeButton}>
        <LabTestingForm {...formProps} onCancel={onClose} headingId={headingId} autoFocus />
      </LabTestingWorkspace>
    </div>
  );
}
