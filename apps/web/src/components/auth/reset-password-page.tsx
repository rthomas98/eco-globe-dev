"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

export function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const validation = useMemo(() => {
    const length = pw.length >= 8;
    const upper = /[A-Z]/.test(pw);
    const number = /[0-9]/.test(pw);
    const match = pw.length > 0 && pw === confirm;
    return { length, upper, number, match };
  }, [pw, confirm]);

  const canSubmit =
    validation.length && validation.upper && validation.number && validation.match && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setDone(true);
  };

  if (!token) {
    return (
      <AuthLayout
        footerContent={
          <p className="text-sm text-neutral-500">
            Lost the reset link?{" "}
            <Link href="/forgot-password" className="font-medium text-neutral-900 underline">
              Request a new one
            </Link>
          </p>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3" style={{ border: "1px solid #FDE68A" }}>
            <AlertCircle className="size-5 text-amber-600" />
            <p className="text-sm text-amber-900">
              This reset link is missing or invalid. Request a new one to continue.
            </p>
          </div>
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            Reset password
          </h1>
          <Link href="/forgot-password">
            <Button variant="primary" size="lg" className="w-full">
              Request reset link
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        footerContent={
          <p className="text-sm text-neutral-500">
            Need help?{" "}
            <Link href="/contact" className="font-medium text-neutral-900 underline">
              Contact our team
            </Link>
          </p>
        }
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            Password updated
          </h1>
          <p className="max-w-[420px] text-sm text-neutral-600">
            You can now sign in with your new password.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            Continue to login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      footerContent={
        <p className="text-sm text-neutral-500">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-neutral-900 underline">
            Back to login
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Pick something strong — at least 8 characters with a number and an uppercase letter.
          </p>
        </div>
        <div className="flex flex-col gap-5">
          <Input
            label="New password"
            id="new-password"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <Input
            label="Confirm new password"
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <ul className="flex flex-col gap-1.5 text-xs">
            <Rule ok={validation.length}>At least 8 characters</Rule>
            <Rule ok={validation.upper}>At least one uppercase letter</Rule>
            <Rule ok={validation.number}>At least one number</Rule>
            <Rule ok={validation.match}>Passwords match</Rule>
          </ul>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          style={!canSubmit ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          onClick={handleSubmit}
        >
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </div>
    </AuthLayout>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-green-700" : "text-neutral-500"}`}>
      <span
        className={`flex size-3.5 items-center justify-center rounded-full text-[10px] ${
          ok ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-400"
        }`}
      >
        {ok ? "✓" : "•"}
      </span>
      {children}
    </li>
  );
}
