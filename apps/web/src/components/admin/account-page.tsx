"use client";

import { useEffect, useState } from "react";
import { readAdminSession } from "@eco-globe/shared/admin-auth";
import { readDemoUser } from "@/lib/demo-user";
import { PasswordChangeForm } from "@/components/account/password-change-form";

/** The signed-in staff account. Values come from the active session only. */
export function AccountPage() {
  const [identity, setIdentity] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    const user = readDemoUser();
    const session = readAdminSession();
    const source = user ?? session;
    setIdentity(source ? { name: source.name, email: source.email } : null);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="max-w-[720px] px-4 py-6 sm:px-8">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900">My Account</h1>
        <section className="mb-6 rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">Profile</h2>
          {identity ? (
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Name</dt>
                <dd className="mt-1 font-semibold text-neutral-900">{identity.name}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="mt-1 font-semibold text-neutral-900">{identity.email}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-neutral-500">No signed-in account was found.</p>
          )}
        </section>
        <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">Password</h2>
          <PasswordChangeForm />
        </section>
      </div>
    </div>
  );
}
