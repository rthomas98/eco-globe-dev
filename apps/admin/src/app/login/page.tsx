import { Suspense } from "react";
import { AdminLoginPage } from "../../components/admin-auth-pages";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <AdminLoginPage />
    </Suspense>
  );
}
