"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  Shield,
  DollarSign,
  Package,
  MapPin,
  Plus,
  ScrollText,
  X,
  Building2,
} from "lucide-react";
import { Button } from "@eco-globe/ui";

export interface PaymentMethodOrderInfo {
  orderId: string;
  shipping: string;
  seller: string;
  total: string;
}

interface Props {
  order: PaymentMethodOrderInfo;
  onBack: () => void;
  onCloseAll: () => void;
}

interface SavedPayment {
  name: string;
  expires: string;
}

interface SavedAddress {
  company: string;
  address: string;
}

const DEMO_PAYMENT: SavedPayment = {
  name: "US Bank Account ****4567",
  expires: "Expires 10/26",
};

const DEMO_ADDRESS: SavedAddress = {
  company: "Acme Company",
  address: "1165 Bayou Paul Ln, St Gabriel, Baton rouge, 93264 LA",
};

function SectionHeader({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-2 rounded-lg bg-neutral-50 px-4 py-2.5">
      <Icon className="size-4 text-neutral-500" />
      <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {children}
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-bold text-neutral-900">{label}</span>
      <span className="text-sm text-neutral-700">{value}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl bg-white p-6"
      style={{ border: "1px solid #F0F0F0" }}
    >
      {children}
    </section>
  );
}

export function BuyerPaymentMethodScreen({ order, onBack, onCloseAll }: Props) {
  const [payment, setPayment] = useState<SavedPayment | null>(DEMO_PAYMENT);
  const [address, setAddress] = useState<SavedAddress | null>(DEMO_ADDRESS);
  const [showSuccess, setShowSuccess] = useState(false);

  const fundAmount = order.total.replace(/\.00$/, "");
  const canFund = !!payment && !!address;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-white">
        <header className="flex items-center justify-between px-6 py-4 sm:px-10">
          <Image
            src="/logo.svg"
            alt="EcoGlobe"
            width={110}
            height={32}
            className="invert"
            priority
          />
          <button
            type="button"
            onClick={onCloseAll}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full hover:bg-neutral-100"
          >
            <X className="size-5 text-neutral-500" />
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="text-6xl">🎉</span>
          <h1 className="mt-6 text-3xl font-bold text-neutral-900">
            Escrow funded successfully
          </h1>
          <p className="mt-3 text-base text-neutral-500">
            The seller has been notified and will begin processing your order.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-8 min-w-[220px]"
            onClick={onBack}
          >
            Back to order details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-4 sm:px-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <Image
          src="/logo.svg"
          alt="EcoGlobe"
          width={110}
          height={32}
          className="invert"
          priority
        />
        <div
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900"
          style={{ border: "1px solid #E0E0E0" }}
        >
          <Shield className="size-4" />
          Secure
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto w-full max-w-[1200px] px-6 py-10 sm:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <Card>
              <SectionHeader icon={Package}>Order Summary</SectionHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Order ID" value={order.orderId} />
                <Field label="Shipping" value={order.shipping} />
                <Field label="Seller" value={order.seller} />
                <Field label="Total" value={order.total} />
              </div>
            </Card>

            <Card>
              <SectionHeader icon={DollarSign}>Payment</SectionHeader>
              {payment ? (
                <div
                  className="flex items-center gap-4 rounded-lg p-4"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                    <Building2 className="size-5 text-neutral-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-neutral-900">
                      {payment.name}
                    </p>
                    <p className="text-sm text-neutral-500">{payment.expires}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayment(null)}
                    className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPayment(DEMO_PAYMENT)}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold text-neutral-900 hover:bg-neutral-50"
                >
                  <Plus className="size-5" />
                  Add Payment
                </button>
              )}
            </Card>

            <Card>
              <SectionHeader icon={MapPin}>Billing Address</SectionHeader>
              {address ? (
                <div
                  className="flex items-center gap-4 rounded-lg p-4"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                    <MapPin className="size-5 text-neutral-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-neutral-900">
                      {address.company}
                    </p>
                    <p className="text-sm text-neutral-500">{address.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddress(null)}
                    className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddress(DEMO_ADDRESS)}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold text-neutral-900 hover:bg-neutral-50"
                >
                  <Plus className="size-5" />
                  Add Billing Address
                </button>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 size-5 text-neutral-700" />
                <div>
                  <p className="text-base font-bold text-neutral-900">
                    Secure payments
                  </p>
                  <p className="text-sm text-neutral-500">
                    Every payment you make is secured
                  </p>
                </div>
              </div>
              <div
                className="my-5"
                style={{ borderTop: "1px solid #F0F0F0" }}
              />
              <div className="flex items-start gap-3">
                <DollarSign className="mt-0.5 size-5 text-neutral-700" />
                <div>
                  <p className="text-base font-bold text-neutral-900">
                    Money-back protection
                  </p>
                  <p className="text-sm text-neutral-500">
                    Guarantee if your order has issues
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="md"
                className="mt-6 w-full"
                disabled={!canFund}
                style={
                  !canFund ? { opacity: 0.4, cursor: "not-allowed" } : undefined
                }
                onClick={() => setShowSuccess(true)}
              >
                Fund Escrow {fundAmount}
              </Button>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <ScrollText className="mt-0.5 size-5 text-neutral-700" />
                <div>
                  <p className="mb-2 text-base font-bold text-neutral-900">
                    What happens next
                  </p>
                  <ul className="flex flex-col gap-1.5 text-sm text-neutral-700">
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-neutral-400" />
                      Escrow funded
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-neutral-400" />
                      Seller begins processing
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-neutral-400" />
                      Shipment
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-neutral-400" />
                      Buyer verification
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-neutral-400" />
                      Funds released
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
