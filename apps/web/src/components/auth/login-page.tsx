"use client";

import Link from "next/link";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

export function LoginPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col gap-10">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Login
        </h1>

        <div className="flex flex-col gap-6">
          <Input
            label="Email Address"
            id="email"
            type="email"
            placeholder="Enter your email"
          />
          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Enter your password"
          />
          <Link
            href="/forgot-password"
            className="text-right text-base font-medium text-neutral-900 underline"
          >
            Forgot Password?
          </Link>
        </div>

        <Button variant="primary" size="lg" className="w-full">
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
