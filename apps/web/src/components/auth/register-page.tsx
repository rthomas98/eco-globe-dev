"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Select } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

const companyTypes = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "recycler", label: "Recycler" },
  { value: "broker", label: "Broker" },
  { value: "other", label: "Other" },
];

export function RegisterPage() {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim();

  return (
    <AuthLayout cardWidth="max-w-[960px]">
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Create Account
        </h1>

        {/* Role toggle */}
        <div
          className="flex overflow-hidden rounded-lg"
          style={{ border: "1px solid #E0E0E0" }}
        >
          <button
            type="button"
            onClick={() => setRole("buyer")}
            className={`flex-1 py-4 text-center text-lg font-semibold transition-colors ${
              role === "buyer"
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-900"
            }`}
          >
            I am a Buyer
          </button>
          <button
            type="button"
            onClick={() => setRole("seller")}
            className={`flex-1 py-4 text-center text-lg font-semibold transition-colors ${
              role === "seller"
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-900"
            }`}
          >
            I am a Seller
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="First Name"
              id="firstName"

              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              id="lastName"

              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <Input
            label="Work email"
            id="email"
            type="email"

            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            id="password"
            type="password"

            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirm Password"
            id="confirmPassword"
            type="password"

            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Select
            label="Company Type"
            id="companyType"
            options={companyTypes}
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isValid}
          style={!isValid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
        >
          Create {role === "buyer" ? "Buyer" : "Seller"} Account
        </Button>

        <p className="text-base text-neutral-900">
          Already have an account?{" "}
          <Link href="/login" className="font-bold underline">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
