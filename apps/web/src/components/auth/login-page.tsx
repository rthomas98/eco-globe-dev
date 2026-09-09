"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";
import { BackendApiError, writeBackendLoginSession } from "@/lib/backend-auth";
import type { UserRole } from "@/lib/demo-user";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const user = await writeBackendLoginSession({
        email,
        password,
      });
      const role: UserRole = user.role;
      const isExplorer =
        (user.companies?.length ?? 0) === 0 &&
        user.accountStatusCode === "unsubscribed";
      const dest = isExplorer
        ? "/welcome"
        : role === "seller"
          ? "/seller/listings"
          : role === "buyer"
            ? "/buyer/browse"
            : "/admin/dashboard";
      const requestedDestination = new URLSearchParams(window.location.search).get("next");
      const rolePrefix = `/${role}`;
      const safeDestination =
        requestedDestination &&
        (requestedDestination === rolePrefix || requestedDestination.startsWith(`${rolePrefix}/`)) &&
        !requestedDestination.startsWith("//")
          ? requestedDestination
          : dest;
      router.push(safeDestination);
    } catch (err) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to log in. Please check the backend is running and try again.",
      );
    } finally {
      setStatus("idle");
    }
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
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-base font-medium text-neutral-900"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg bg-white px-4 py-3 pr-12 text-base text-neutral-900 outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-neutral-900/20"
                style={{ border: "1px solid #E0E0E0" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleLogin();
                  }
                }}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30"
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden="true" />
                ) : (
                  <Eye className="size-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <Link
            href="/forgot-password"
            className="text-left text-sm font-medium text-neutral-900 underline"
          >
            Forgot Password?
          </Link>
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!email.trim() || !password.trim() || status === "loading"}
          style={
            !email.trim() || !password.trim() || status === "loading"
              ? { opacity: 0.4, cursor: "not-allowed" }
              : undefined
          }
          onClick={() => void handleLogin()}
        >
          {status === "loading" ? "Logging in..." : "Login"}
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
