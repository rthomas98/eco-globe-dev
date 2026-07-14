"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FileText,
  Leaf,
  PackageOpen,
  ShieldCheck,
  Truck,
  Upload,
} from "lucide-react";
import { Button, Select } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { carrierQuotes, logisticsShipments } from "../logistics/logistics-demo-data";

type FulfillmentState = Record<string, "Needs quote" | "Booked" | "BOL uploaded" | "Dispatched">;

export function SellerLogisticsPage() {
  const sellerShipments = logisticsShipments.filter((shipment) =>
    ["GulfStar Chemicals", "EcoPack Co.", "Metal Reclaim LLC", "TerraGenesis Biofuels"].includes(shipment.seller),
  );
  const [states, setStates] = useState<FulfillmentState>({
    "SHP-50021": "Needs quote",
    "SHP-50018": "Booked",
    "SHP-50012": "BOL uploaded",
    "SHP-50009": "Needs quote",
  });
  const [selected, setSelected] = useState(sellerShipments[0]);

  const updateState = (id: string, state: FulfillmentState[string]) => {
    setStates((current) => ({ ...current, [id]: state }));
  };

  return (
    <SellerLayout title="Logistics & Shipping">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
            Fulfillment workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">
            Quote, book, dispatch, and confirm shipments.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Seller view for carrier quotes, Bill of Lading upload, tracking handoff,
            delivery confirmation, and sustainable shipping options.
          </p>
        </div>
        <Button variant="primary" size="md">Request carrier quote</Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Quotes needed", value: "2", icon: Truck },
          { label: "BOL pending", value: "1", icon: FileText },
          { label: "In transit", value: "2", icon: PackageOpen },
          { label: "CO2 avoided", value: "14.8 t", icon: Leaf },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-neutral-500">{stat.label}</span>
              <stat.icon className="size-5 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Shipment queue</h2>
              <p className="text-sm text-neutral-500">
                Operational actions sellers need before the buyer can receive materials.
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              Carrier integrations live
            </span>
          </div>

          <div className="space-y-3">
            {sellerShipments.map((shipment) => {
              const state = states[shipment.id] ?? "Needs quote";
              return (
                <button
                  key={shipment.id}
                  type="button"
                  onClick={() => setSelected(shipment)}
                  className={`w-full rounded-2xl p-4 text-left transition hover:bg-neutral-50 ${
                    selected.id === shipment.id ? "bg-neutral-50" : "bg-white"
                  }`}
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-neutral-900">{shipment.orderId} · {shipment.product}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {shipment.origin} to {shipment.destination} · {shipment.quantity}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {state}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <SmallMetric label="Carrier" value={shipment.carrier} />
                    <SmallMetric label="Cost" value={shipment.cost} />
                    <SmallMetric label="ETA" value={shipment.eta} />
                    <SmallMetric label="Carbon" value={`${shipment.carbonKg} kg`} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="text-xl font-bold text-neutral-900">Fulfillment actions</h2>
          <p className="mt-1 text-sm text-neutral-500">{selected.orderId} · {selected.trackingId}</p>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-900">Recommended carrier</p>
              <p className="mt-1 text-sm text-neutral-600">
                {carrierQuotes[0].carrier} is the lowest-carbon route at {carrierQuotes[0].cost}.
              </p>
            </div>

            <div className="grid gap-3">
              <Select
                id="seller-carrier"
                label="Carrier"
                options={carrierQuotes.map((quote) => ({ value: quote.carrier, label: `${quote.carrier} · ${quote.cost}` }))}
              />
              <Select
                id="seller-window"
                label="Pickup window"
                options={[
                  { value: "am", label: "Tomorrow, 8 AM - 12 PM" },
                  { value: "pm", label: "Tomorrow, 1 PM - 5 PM" },
                  { value: "custom", label: "Request custom window" },
                ]}
              />
            </div>

            <ActionButton
              icon={Truck}
              title="Send shipping quote"
              description="Send carrier cost, ETA, and carbon estimate to the buyer."
              onClick={() => updateState(selected.id, "Booked")}
            />
            <ActionButton
              icon={Upload}
              title="Upload Bill of Lading"
              description="Attach BOL and chain-of-custody documents for the shipment."
              onClick={() => updateState(selected.id, "BOL uploaded")}
            />
            <ActionButton
              icon={CheckCircle2}
              title="Mark dispatched"
              description="Confirm carrier pickup and start tracking updates."
              onClick={() => updateState(selected.id, "Dispatched")}
            />

            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-4" />
                Sustainable shipping option
              </div>
              <p className="mt-1">
                EcoGlobe recommends the route that avoids{" "}
                {selected.optimizedCarbonKg - selected.carbonKg} kg CO2e versus default carrier routing.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </SellerLayout>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl bg-white p-4 text-left hover:bg-neutral-50"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <Icon className="mt-0.5 size-5 text-neutral-500" />
      <span>
        <span className="block text-sm font-semibold text-neutral-900">{title}</span>
        <span className="mt-1 block text-sm text-neutral-500">{description}</span>
      </span>
    </button>
  );
}
