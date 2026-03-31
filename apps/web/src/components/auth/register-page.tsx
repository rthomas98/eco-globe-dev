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

  return (
    <AuthLayout cardWidth="max-w-[800px]">
      <div className="flex flex-col gap-10">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Create Account
        </h1>

        {/* Role toggle */}
        <div className="flex overflow-hidden rounded-lg" style={{ border: "1px solid #E0E0E0" }}>
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

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="First Name"
              id="firstName"
              placeholder="First name"
            />
            <Input
              label="Last Name"
              id="lastName"
              placeholder="Last name"
            />
          </div>
          <Input
            label="Work email"
            id="email"
            type="email"
            placeholder="Enter your work email"
          />
          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Create a password"
          />
          <Input
            label="Confirm Password"
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
          />
          <Select
            label="Company Type"
            id="companyType"
            options={companyTypes}
          />
        </div>

        <Button variant="primary" size="lg" className="w-full">
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
