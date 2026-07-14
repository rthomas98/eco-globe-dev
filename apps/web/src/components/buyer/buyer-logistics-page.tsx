"use client";

import { useState } from "react";
import {
  Clock3,
  Leaf,
  PackageCheck,
  Route,
  Truck,
} from "lucide-react";
import { Button, Select } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import {
  carrierQuotes,
  logisticsShipments,
  type LogisticsShipment,
} from "../logistics/logistics-demo-data";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">{label}</span>
        <Icon className="size-5 text-neutral-400" />
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: LogisticsShipment["status"] }) {
  const tone =
    status === "Exception"
      ? "bg-red-50 text-red-700"
      : status === "Delivered"
        ? "bg-green-50 text-green-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export function BuyerLogisticsPage() {
  const [selected, setSelected] = useState(logisticsShipments[0]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const activeQuotes = carrierQuotes.slice().sort((a, b) => a.carbonKg - b.carbonKg);

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              Logistics & Shipping
            </p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">
              Track shipments, compare carriers, and confirm delivery.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Buyer view for real-time shipping costs, carbon-optimized carrier options,
              tracking updates, and delivery confirmation tied to escrow release.
            </p>
          </div>
          <Button variant="primary" size="md">Calculate shipping</Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Active shipments" value="3" icon={Truck} />
          <StatCard label="Awaiting confirmation" value="1" icon={PackageCheck} />
          <StatCard label="Avg quote time" value="42 sec" icon={Clock3} />
          <StatCard label="CO2 avoided" value="14.8 t" icon={Leaf} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Shipment tracking</h2>
                <p className="text-sm text-neutral-500">
                  Live carrier status, ETA, and delivery confirmation.
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                Tracking integrated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="text-left text-sm text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Carrier</th>
                    <th className="pb-3 font-medium">ETA</th>
                    <th className="pb-3 font-medium">Carbon</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logisticsShipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      onClick={() => setSelected(shipment)}
                      className={`cursor-pointer text-sm hover:bg-neutral-50 ${
                        selected.id === shipment.id ? "bg-neutral-50" : ""
                      }`}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                    >
                      <td className="py-4 font-semibold text-neutral-900">{shipment.orderId}</td>
                      <td className="py-4 text-neutral-700">{shipment.product}</td>
                      <td className="py-4 text-neutral-700">{shipment.carrier}</td>
                      <td className="py-4 text-neutral-700">{shipment.eta}</td>
                      <td className="py-4 text-neutral-700">{shipment.carbonKg} kg CO2e</td>
                      <td className="py-4"><StatusPill status={shipment.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900">Shipment detail</h2>
              <StatusPill status={selected.status} />
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tracking ID</p>
                <p className="mt-1 font-mono text-neutral-900">{selected.trackingId}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Origin</p>
                  <p className="mt-1 text-neutral-900">{selected.origin}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Destination</p>
                  <p className="mt-1 text-neutral-900">{selected.destination}</p>
                </div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="mb-3 text-sm font-semibold text-neutral-900">Route</p>
                <div className="space-y-3">
                  {selected.route.map((stop, index) => (
                    <div key={stop} className="flex items-center gap-3">
                      <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-700">
                        {index + 1}
                      </span>
                      <span className="text-sm text-neutral-700">{stop}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-green-50 p-4 text-green-800">
                <p className="font-semibold">Carbon optimized route</p>
                <p className="mt-1 text-sm">
                  Saves {selected.optimizedCarbonKg - selected.carbonKg} kg CO2e versus the default route.
                </p>
              </div>
              <p className="text-neutral-600">{selected.lastUpdate}</p>
              <p className="font-medium text-neutral-900">{selected.nextStep}</p>
              <Button
                type="button"
                variant={confirmed[selected.id] ? "secondary" : "primary"}
                size="md"
                disabled={selected.status !== "Delivered" || confirmed[selected.id]}
                onClick={() => setConfirmed((current) => ({ ...current, [selected.id]: true }))}
                className="w-full"
              >
                {confirmed[selected.id] ? "Delivery confirmed" : "Confirm delivery"}
              </Button>
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h2 className="text-xl font-bold text-neutral-900">Shipping cost calculator</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Sample UI for live carrier rate shopping before checkout.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Select id="origin" label="Origin" options={[{ value: "cadiz", label: "Cadiz, Spain" }, { value: "houston", label: "Houston, TX" }]} />
              <Select id="destination" label="Destination" options={[{ value: "atlanta", label: "Atlanta, GA" }, { value: "baton-rouge", label: "Baton Rouge, LA" }]} />
              <Select id="quantity" label="Quantity" options={[{ value: "20", label: "20 tons" }, { value: "200", label: "200 tons" }, { value: "1000", label: "1,000 tons" }]} />
              <Select id="optimization" label="Optimize for" options={[{ value: "co2", label: "Lowest CO2" }, { value: "cost", label: "Lowest cost" }, { value: "speed", label: "Fastest ETA" }]} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h2 className="text-xl font-bold text-neutral-900">Carrier quotes</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {activeQuotes.map((quote) => (
                <div key={quote.carrier} className="rounded-xl bg-neutral-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">{quote.carrier}</p>
                      <p className="text-xs text-neutral-500">{quote.service}</p>
                    </div>
                    <Route className="size-5 text-neutral-400" />
                  </div>
                  <p className="text-2xl font-bold text-neutral-900">{quote.cost}</p>
                  <div className="mt-3 space-y-1 text-sm text-neutral-600">
                    <p>ETA: {quote.eta}</p>
                    <p>Carbon: {quote.carbonKg} kg CO2e</p>
                    <p>On-time: {quote.onTimeRate}</p>
                    <p className="font-semibold text-green-700">{quote.sustainableOption}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </BuyerLayout>
  );
}
