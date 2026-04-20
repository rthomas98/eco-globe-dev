"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

export function LoginPage() {
  const [email, setEmail] = useState("");

  return (
    <AuthLayout
      footerContent={
        <p className="text-sm text-neutral-500">
          Having issues logging in? Please,{" "}
          <Link href="/contact" className="font-medium text-neutral-900 underline">
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
            placeholder="Input field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Input field"
          />
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
          style={!email.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
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
