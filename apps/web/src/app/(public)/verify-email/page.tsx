import { Suspense } from "react";
import { VerifyEmailPage } from "@/components/auth/verify-email-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
      <VerifyEmailPage />
    </Suspense>
  );
}
