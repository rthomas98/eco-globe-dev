"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Mail, Loader2 } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

type State = "verifying" | "success" | "expired" | "no-token";

export function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>(token ? "verifying" : "no-token");
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => {
      // Demo: treat any token starting with "x" as expired, everything else verifies.
      setState(token.startsWith("x") ? "expired" : "success");
    }, 1200);
    return () => clearTimeout(t);
  }, [token]);

  const handleResend = async () => {
    setResent(false);
    await new Promise((r) => setTimeout(r, 400));
    setResent(true);
  };

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
      {state === "verifying" && (
        <div className="flex flex-col items-center gap-5 text-center">
          <Loader2 className="size-10 animate-spin text-neutral-500" />
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            Verifying your email…
          </h1>
          <p className="max-w-[420px] text-sm text-neutral-600">
            Hang tight — this usually takes just a moment.
          </p>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            Email verified
          </h1>
          <p className="max-w-[420px] text-sm text-neutral-600">
            Your account is ready. You can now sign in and start browsing the
            marketplace.
          </p>
          <Link href="/login" className="w-full">
            <Button variant="primary" size="lg" className="w-full">
              Continue to login
            </Button>
          </Link>
        </div>
      )}

      {state === "expired" && (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            This link expired
          </h1>
          <p className="max-w-[420px] text-sm text-neutral-600">
            Verification links are valid for 24 hours. We can send a fresh one to
            your inbox.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleResend}
          >
            {resent ? "Email sent — check your inbox" : "Resend verification email"}
          </Button>
        </div>
      )}

      {state === "no-token" && (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            <Mail className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            Check your inbox
          </h1>
          <p className="max-w-[420px] text-sm text-neutral-600">
            We sent a verification link to the email on file. Open it from any
            device to confirm your account.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleResend}
          >
            {resent ? "Email sent — check your inbox" : "Resend email"}
          </Button>
          <p className="text-xs text-neutral-500">
            Wrong address?{" "}
            <Link href="/contact" className="font-medium text-neutral-900 underline">
              Contact support
            </Link>{" "}
            to update it.
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
