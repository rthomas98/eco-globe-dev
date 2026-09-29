"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import {
  authenticateAdmin,
  readAdminSession,
  requestAdminPasswordReset,
  resetAdminPassword,
} from "@eco-globe/shared/admin-auth";

function safeAdminDestination(value: string | null) {
  return value?.startsWith("/admin") ? value : "/admin/sales";
}

function AdminAuthFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.17),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.13),transparent_34%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between px-12 py-10 lg:flex xl:px-20 xl:py-14">
          <Link href="/" className="w-fit" aria-label="EcoGlobe admin home">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={120}
              height={35}
              className="h-auto w-[128px] brightness-0 invert"
              priority
            />
          </Link>

          <div className="max-w-[570px]">
            <div className="mb-8 flex size-16 items-center justify-center rounded-2xl bg-emerald-400 text-neutral-950 shadow-[0_18px_60px_rgba(52,211,153,0.22)]">
              <ShieldCheck className="size-8" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">
              Protected operations workspace
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight xl:text-5xl">
              Control the marketplace with accountable, role-aware access.
            </h2>
            <p className="mt-5 max-w-[520px] text-base leading-7 text-neutral-400">
              Review transactions, compliance, partners, escrow, and platform
              health from one secured command center.
            </p>
          </div>

          <div className="grid max-w-[570px] grid-cols-3 gap-3 text-xs text-neutral-400">
            {["Session controls", "Recovery checks", "Admin-only access"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <Check
                    className="mb-3 size-4 text-emerald-300"
                    aria-hidden="true"
                  />
                  {item}
                </div>
              ),
            )}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:bg-white/[0.03] lg:px-12">
          <div className="w-full max-w-[520px] rounded-[28px] border border-white/10 bg-white p-6 text-neutral-900 shadow-2xl sm:p-10">
            <div className="mb-8 lg:hidden">
              <Image
                src="/logo.svg"
                alt="EcoGlobe"
                width={120}
                height={35}
                className="h-auto w-[114px] invert"
                priority
              />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {description}
            </p>
            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
  trailing,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-neutral-800"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 pr-12 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-neutral-950/5"
        />
        {trailing}
      </div>
    </div>
  );
}

export function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const destination = safeAdminDestination(params.get("next"));
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (readAdminSession()) router.replace(destination);
  }, [destination, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await authenticateAdmin({ email, password, remember });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace(destination);
    router.refresh();
  };

  return (
    <AdminAuthFrame
      eyebrow="Admin sign in"
      title="Welcome back"
      description="Sign in with an authorized administrator account to continue to EcoGlobe operations."
    >
      {params.get("reason") === "signed-out" && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          You have been signed out securely.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          id="email"
          label="Admin email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="username"
        />
        <Field
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          trailing={
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          }
        />

        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-neutral-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 accent-neutral-950"
            />
            Keep me signed in
          </label>
          <Link
            href="/forgot-password"
            className="font-semibold text-neutral-950 underline decoration-neutral-300 underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={submitting || !email || !password}
        >
          {submitting ? "Signing in…" : "Sign in to admin"}
          {!submitting && <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </form>

    </AdminAuthFrame>
  );
}

export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await requestAdminPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminAuthFrame
      eyebrow="Account recovery"
      title={sent ? "Check your email" : "Reset your password"}
      description={
        sent
          ? "For account safety, this confirmation is the same whether or not an account exists."
          : "Enter the administrator email associated with the workspace."
      }
    >
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Mail className="size-5" />
          </div>
          <Field
            id="recovery-email"
            label="Admin email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!email.trim() || sending}>
            {sending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-neutral-600">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-neutral-950 underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </form>
      ) : (
        <div className="space-y-5">
          <div role="status" className="rounded-2xl bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
            If an administrator account exists for <strong>{email}</strong>, a password-reset link has
            been emailed. The link expires; request a new one if needed.
          </div>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="w-full text-sm font-semibold text-neutral-700 underline underline-offset-4"
          >
            Try another email
          </button>
        </div>
      )}
    </AdminAuthFrame>
  );
}

export function AdminResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const rules = useMemo(
    () => ({
      length: password.length >= 10,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
      matches: password.length > 0 && password === confirmPassword,
    }),
    [confirmPassword, password],
  );
  const validPassword = Object.values(rules).every(Boolean);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await resetAdminPassword({ token, password });
      setComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The reset link is invalid or has expired.");
    }
  };

  if (!token) {
    return (
      <AdminAuthFrame
        eyebrow="Account recovery"
        title="Reset link missing"
        description="Open the password-reset link from your email, or request a new one."
      >
        <Link href="/forgot-password" className="block">
          <Button variant="primary" size="lg" className="w-full">
            Request a reset link
          </Button>
        </Link>
      </AdminAuthFrame>
    );
  }

  if (complete) {
    return (
      <AdminAuthFrame
        eyebrow="Account recovery"
        title="Password updated"
        description="Your previous admin sessions were cleared. Sign in again with the new password."
      >
        <div className="space-y-5 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="size-7" />
          </div>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() =>
              router.replace("/login")
            }
          >
            Continue to sign in
          </Button>
        </div>
      </AdminAuthFrame>
    );
  }

  return (
    <AdminAuthFrame
      eyebrow="Account recovery"
      title="Create a new password"
      description="Choose a strong replacement password."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          id="new-password"
          label="New password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          trailing={
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          }
        />
        <Field
          id="confirm-password"
          label="Confirm new password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <div className="grid gap-2 rounded-2xl bg-neutral-50 p-4 text-xs sm:grid-cols-2">
          <PasswordRule ok={rules.length}>10 or more characters</PasswordRule>
          <PasswordRule ok={rules.lower}>Lowercase letter</PasswordRule>
          <PasswordRule ok={rules.upper}>Uppercase letter</PasswordRule>
          <PasswordRule ok={rules.number}>Number</PasswordRule>
          <PasswordRule ok={rules.special}>Special character</PasswordRule>
          <PasswordRule ok={rules.matches}>Passwords match</PasswordRule>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!validPassword}
        >
          Update admin password
        </Button>
        <Link
          href="/forgot-password"
          className="block text-center text-sm font-semibold text-neutral-700 underline underline-offset-4"
        >
          Request a new link
        </Link>
      </form>
    </AdminAuthFrame>
  );
}

function PasswordRule({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      className={`flex items-center gap-2 ${ok ? "text-emerald-800" : "text-neutral-500"}`}
    >
      <span
        className={`flex size-4 items-center justify-center rounded-full ${ok ? "bg-emerald-100" : "bg-neutral-200"}`}
      >
        {ok ? <Check className="size-3" /> : "·"}
      </span>
      {children}
    </p>
  );
}
