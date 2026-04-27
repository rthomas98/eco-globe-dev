"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";
import { buildDemoUser, writeDemoUser, type UserRole } from "@/lib/demo-user";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleLogin = () => {
    const e = email.toLowerCase();
    const role: UserRole = e.includes("seller")
      ? "seller"
      : e.includes("buyer")
        ? "buyer"
        : "admin";
    writeDemoUser(buildDemoUser(role, { email }));
    const dest =
      role === "seller"
        ? "/seller/listings"
        : role === "buyer"
          ? "/buyer/browse"
          : "/admin/dashboard";
    router.push(dest);
  };

  const loginAs = (role: UserRole) => {
    writeDemoUser(buildDemoUser(role));
    const dest =
      role === "seller"
        ? "/seller/listings"
        : role === "buyer"
          ? "/buyer/browse"
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

        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Demo Quick Login
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => loginAs("seller")}
            >
              Login as Seller
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => loginAs("buyer")}
            >
              Login as Buyer
            </Button>
          </div>
          <button
            type="button"
            onClick={() => loginAs("admin")}
            className="text-left text-xs text-neutral-500 underline hover:text-neutral-900"
          >
            Or login as Admin
          </button>
        </div>

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
