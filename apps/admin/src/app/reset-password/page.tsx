import { Suspense } from "react";
import { AdminResetPasswordPage } from "../../components/admin-auth-pages";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <AdminResetPasswordPage />
    </Suspense>
  );
}
