import { Suspense } from "react";
import { ResetPasswordPage } from "@/components/auth/reset-password-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
      <ResetPasswordPage />
    </Suspense>
  );
}
