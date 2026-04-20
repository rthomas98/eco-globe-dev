"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleLogin = () => {
    const e = email.toLowerCase();
    const dest = e.includes("seller")
      ? "/seller/listings"
      : e.includes("buyer")
        ? "/browse"
        : "/admin/dashboard";
    router.push(dest);
  };

  return (
    <AuthLayout
      footerContent={
        <p className="text-sm text-neutral-500">
          Having issues logging in? Please,{" "}
          <Link
            href="/contact"
            className="font-medium text-neutral-900 underline"
          >
            contact our team here
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Login
        </h1>

        <div className="flex flex-col gap-5">
          <Input
            label="Email Address"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input label="Password" id="password" type="password" />
          <Link
            href="/forgot-password"
            className="text-left text-sm font-medium text-neutral-900 underline"
          >
            Forgot Password?
          </Link>
          <p className="text-xs text-neutral-500">
            Demo: any email logs you in. Put <strong>seller</strong> or{" "}
            <strong>buyer</strong> in the email to go to those portals;
            otherwise you&apos;ll land on the Admin dashboard.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!email.trim()}
          style={
            !email.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined
          }
          onClick={handleLogin}
        >
          Login
        </Button>

        <p className="text-base text-neutral-900">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold underline">
            Register
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
