"use client";

import { useEffect, useRef, useState } from "react";
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
import { carrierQuotes, logisticsShipments, mapLiveShipment } from "../logistics/logistics-demo-data";
import Link from "next/link";
import {
  fetchCarriers,
  fetchShipments,
  updateShipment,
  uploadBillOfLading,
  type ApiCarrier,
} from "@/lib/api-fulfilment";
import { fetchOrders } from "@/lib/api-orders";
import { readDemoUser } from "@/lib/demo-user";

type FulfillmentState = Record<string, "Needs quote" | "Booked" | "BOL uploaded" | "Dispatched">;

export function SellerLogisticsPage() {
  const demoShipments = logisticsShipments.filter((shipment) =>
    ["GulfStar Chemicals", "EcoPack Co.", "Metal Reclaim LLC", "TerraGenesis Biofuels"].includes(shipment.seller),
  );
  const [sellerShipments, setSellerShipments] = useState(demoShipments);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [liveOrderIds, setLiveOrderIds] = useState<Record<string, number>>({});
  const [carriers, setCarriers] = useState<ApiCarrier[]>([]);
  const [carrierChoice, setCarrierChoice] = useState("");
  const [windowChoice, setWindowChoice] = useState("am");
  const [actionNotice, setActionNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const bolInputRef = useRef<HTMLInputElement>(null);

  // Real carrier catalogue for the quote dropdown.
  useEffect(() => {
    fetchCarriers()
      .then((rows) => {
        setCarriers(rows);
        if (rows[0]) setCarrierChoice(rows[0].code);
      })
      .catch(() => {});
  }, []);

  // Live shipments on this seller's orders render ahead of the demo rows.
  useEffect(() => {
    const user = readDemoUser();
    if (!user?.activeCompanyId) return;
    let cancelled = false;
    Promise.all([fetchShipments(), fetchOrders({ sellerCompanyId: user.activeCompanyId })])
      .then(([shipments, orders]) => {
        if (cancelled) return;
        const orderById = new Map(orders.map((o) => [o.id, o]));
        const live = shipments
          .filter((s) => orderById.has(s.orderId))
          .map((s) => mapLiveShipment(s, orderById.get(s.orderId)));
        if (live.length > 0) {
          setSellerShipments([...live, ...demoShipments]);
          setLiveIds(new Set(live.map((row) => row.id)));
          setLiveOrderIds(
            Object.fromEntries(
              shipments
                .filter((sh) => orderById.has(sh.orderId))
                .map((sh) => [`SHP-${sh.id}`, sh.orderId]),
            ),
          );
          setSelected(live[0]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [states, setStates] = useState<FulfillmentState>({
    "SHP-50021": "Needs quote",
    "SHP-50018": "Booked",
    "SHP-50012": "BOL uploaded",
    "SHP-50009": "Needs quote",
  });
  const [selected, setSelected] = useState(sellerShipments[0]);

  const pickupWindowDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(windowChoice === "pm" ? 13 : 8, 0, 0, 0);
    return date.toISOString();
  };

  const updateState = (id: string, state: FulfillmentState[string]) => {
    setStates((current) => ({ ...current, [id]: state }));
    setActionNotice(null);
    // Only API-backed rows persist; demo rows stay a local walkthrough.
    const match = liveIds.has(id) ? /^SHP-(\d+)$/.exec(id) : null;
    if (match) {
      const statusCode =
        state === "Booked"
          ? "scheduled"
          : state === "BOL uploaded" || state === "Dispatched"
            ? "in_transit"
            : undefined;
      if (statusCode) {
        void updateShipment(Number(match[1]), {
          shipmentStatusCode: statusCode,
          ...(state === "Booked"
            ? { carrierCode: carrierChoice || undefined, pickupScheduledAt: pickupWindowDate() }
            : {}),
        })
          .then(() => setActionNotice({ kind: "ok", text: `${id} updated for the buyer.` }))
          .catch((error) =>
            setActionNotice({
              kind: "error",
              text: error instanceof Error ? error.message : "Update failed.",
            }),
          );
      }
    }
  };

  const handleBolFile = async (file: File | undefined) => {
    if (!file) return;
    const orderId = liveOrderIds[selected.id];
    if (!orderId) {
      // Demo rows keep the local walkthrough.
      updateState(selected.id, "BOL uploaded");
      return;
    }
    setActionNotice(null);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      await uploadBillOfLading({
        orderId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        dataBase64,
      });
      setStates((current) => ({ ...current, [selected.id]: "BOL uploaded" }));
      setActionNotice({ kind: "ok", text: `BOL uploaded — ${selected.id} is in transit.` });
    } catch (error) {
      setActionNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "BOL upload failed.",
      });
    }
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
        <Link href="/seller/sales">
          <Button variant="primary" size="md">Request carrier quote</Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Quotes needed",
            value: String(
              sellerShipments.filter((row) => (states[row.id] ?? "Needs quote") === "Needs quote").length,
            ),
            icon: Truck,
          },
          {
            label: "BOL pending",
            value: String(sellerShipments.filter((row) => states[row.id] === "Booked").length),
            icon: FileText,
          },
          {
            label: "In transit",
            value: String(
              sellerShipments.filter((row) =>
                ["BOL uploaded", "Dispatched"].includes(states[row.id] ?? ""),
              ).length,
            ),
            icon: PackageOpen,
          },
          {
            label: "CO2 avoided",
            value: `${(sellerShipments.reduce((total, row) => total + Math.max(0, row.optimizedCarbonKg - row.carbonKg), 0) / 1000).toFixed(1)} t`,
            icon: Leaf,
          },
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
                value={carrierChoice}
                onChange={(event) => setCarrierChoice(event.target.value)}
                options={
                  carriers.length > 0
                    ? carriers.map((carrier) => ({ value: carrier.code, label: carrier.name }))
                    : carrierQuotes.map((quote) => ({ value: quote.carrier, label: `${quote.carrier} · ${quote.cost}` }))
                }
              />
              <Select
                id="seller-window"
                label="Pickup window"
                value={windowChoice}
                onChange={(event) => setWindowChoice(event.target.value)}
                options={[
                  { value: "am", label: "Tomorrow, 8 AM - 12 PM" },
                  { value: "pm", label: "Tomorrow, 1 PM - 5 PM" },
                ]}
              />
            </div>

            {actionNotice && (
              <p
                className={`rounded-lg px-4 py-2.5 text-sm ${
                  actionNotice.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                }`}
              >
                {actionNotice.text}
              </p>
            )}
            <ActionButton
              icon={Truck}
              title="Send shipping quote"
              description="Send carrier cost, ETA, and carbon estimate to the buyer."
              onClick={() => updateState(selected.id, "Booked")}
            />
            <input
              ref={bolInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(event) => {
                void handleBolFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <ActionButton
              icon={Upload}
              title="Upload Bill of Lading"
              description="Attach BOL and chain-of-custody documents for the shipment."
              onClick={() => bolInputRef.current?.click()}
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
