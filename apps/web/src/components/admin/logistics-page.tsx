"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Leaf,
  MessageSquare,
  RadioTower,
  Route,
  Settings2,
  Truck,
} from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import {
  carrierIntegrations,
  logisticsShipments,
  routeOptimizationSummary,
  type CarrierIntegration,
  type LogisticsShipment,
} from "../logistics/logistics-demo-data";

type ShipmentFilter = "all" | "exceptions" | "delivered" | "active";
type CarrierFormMode = "add" | "edit";
type ActivityLogEntry = {
  id: string;
  message: string;
};
type CarrierFormState = {
  name: string;
  status: CarrierIntegration["status"];
  coverage: string;
  avgResponse: string;
  activeShipments: string;
  issue: string;
};

const emptyCarrierForm: CarrierFormState = {
  name: "",
  status: "Pending",
  coverage: "",
  avgResponse: "",
  activeShipments: "0",
  issue: "",
};

function createActivityEntry(message: string): ActivityLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    message,
  };
}

export function AdminLogisticsPage() {
  const [shipments, setShipments] = useState<LogisticsShipment[]>(logisticsShipments);
  const [carriers, setCarriers] = useState<CarrierIntegration[]>(carrierIntegrations);
  const [selected, setSelected] = useState<LogisticsShipment>(logisticsShipments[0]);
  const [filter, setFilter] = useState<ShipmentFilter>("all");
  const [carrierContact, setCarrierContact] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [carrierFormMode, setCarrierFormMode] = useState<CarrierFormMode | null>(null);
  const editingCarrierName = useRef<string | null>(null);
  const [carrierForm, setCarrierForm] = useState<CarrierFormState>(emptyCarrierForm);
  const [carrierFormError, setCarrierFormError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);

  const exceptionCount = shipments.filter((shipment) => shipment.status === "Exception").length;
  const carrierActiveCount = carriers.reduce((total, carrier) => total + carrier.activeShipments, 0);
  const filteredShipments = shipments.filter((shipment) => {
    if (filter === "exceptions") return shipment.status === "Exception";
    if (filter === "delivered") return shipment.status === "Delivered";
    if (filter === "active") return shipment.status !== "Delivered";
    return true;
  });

  function updateShipment(shipment: LogisticsShipment) {
    setShipments((current) => current.map((item) => (item.id === shipment.id ? shipment : item)));
    setSelected(shipment);
  }

  function openAddCarrierForm() {
    setCarrierFormMode("add");
    editingCarrierName.current = null;
    setCarrierForm(emptyCarrierForm);
    setCarrierFormError(null);
    setDeleteCandidate(null);
  }

  function openEditCarrierForm(carrier: CarrierIntegration) {
    setCarrierFormMode("edit");
    editingCarrierName.current = carrier.name;
    setCarrierForm({
      name: carrier.name,
      status: carrier.status,
      coverage: carrier.coverage,
      avgResponse: carrier.avgResponse,
      activeShipments: String(carrier.activeShipments),
      issue: carrier.issue ?? "",
    });
    setCarrierFormError(null);
    setDeleteCandidate(null);
  }

  function closeCarrierForm() {
    setCarrierFormMode(null);
    editingCarrierName.current = null;
    setCarrierForm(emptyCarrierForm);
    setCarrierFormError(null);
  }

  function updateCarrierField<Field extends keyof CarrierFormState>(field: Field, value: CarrierFormState[Field]) {
    setCarrierForm((current) => ({ ...current, [field]: value }));
  }

  function handleCarrierSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = carrierForm.name.trim();
    const duplicateCarrier = carriers.some((carrier) => {
      if (carrier.name === editingCarrierName.current) return false;
      return carrier.name.toLowerCase() === trimmedName.toLowerCase();
    });
    const activeShipments = Number.parseInt(carrierForm.activeShipments, 10);

    if (!trimmedName) {
      setCarrierFormError("Carrier name is required.");
      return;
    }

    if (!carrierForm.coverage.trim()) {
      setCarrierFormError("Coverage is required.");
      return;
    }

    if (!carrierForm.avgResponse.trim()) {
      setCarrierFormError("Average response time is required.");
      return;
    }

    if (!Number.isFinite(activeShipments) || activeShipments < 0) {
      setCarrierFormError("Active shipments must be zero or greater.");
      return;
    }

    if (duplicateCarrier) {
      setCarrierFormError("A carrier integration with this name already exists.");
      return;
    }

    const carrier: CarrierIntegration = {
      name: trimmedName,
      status: carrierForm.status,
      coverage: carrierForm.coverage.trim(),
      avgResponse: carrierForm.avgResponse.trim(),
      activeShipments,
      issue: carrierForm.issue.trim() || undefined,
    };

    if (carrierFormMode === "edit" && editingCarrierName.current) {
      const previousCarrierName = editingCarrierName.current;

      setCarriers((current) => current.map((item) => (item.name === previousCarrierName ? carrier : item)));
      setShipments((current) =>
        current.map((shipment) =>
          shipment.carrier === previousCarrierName ? { ...shipment, carrier: carrier.name } : shipment,
        ),
      );
      setSelected((current) => (current.carrier === previousCarrierName ? { ...current, carrier: carrier.name } : current));
      setActionNotice(`${carrier.name} carrier integration updated.`);
      setActivityLog((current) => [createActivityEntry(`Updated carrier integration for ${carrier.name}.`), ...current]);
    } else {
      setCarriers((current) => [carrier, ...current]);
      setActionNotice(`${carrier.name} carrier integration added.`);
      setActivityLog((current) => [createActivityEntry(`Added carrier integration for ${carrier.name}.`), ...current]);
    }

    closeCarrierForm();
  }

  function handleDeleteCarrier(carrier: CarrierIntegration) {
    if (deleteCandidate !== carrier.name) {
      setDeleteCandidate(carrier.name);
      setActionNotice(`Confirm deletion for ${carrier.name}. Shipments using this carrier will be set to Carrier pending.`);
      return;
    }

    setCarriers((current) => current.filter((item) => item.name !== carrier.name));
    setShipments((current) =>
      current.map((shipment) =>
        shipment.carrier === carrier.name ? { ...shipment, carrier: "Carrier pending" } : shipment,
      ),
    );
    setSelected((current) => (current.carrier === carrier.name ? { ...current, carrier: "Carrier pending" } : current));
    setDeleteCandidate(null);
    setActionNotice(`${carrier.name} carrier integration deleted.`);
    setActivityLog((current) => [createActivityEntry(`Deleted carrier integration for ${carrier.name}.`), ...current]);

    if (editingCarrierName.current === carrier.name) {
      closeCarrierForm();
    }
  }

  function handleContactCarrier() {
    const message = `Carrier contact opened for ${selected.carrier} on ${selected.id}. Request current ETA, driver status, and next checkpoint confirmation for ${selected.trackingId}.`;

    setCarrierContact(message);
    setActionNotice(`${selected.carrier} contact workflow opened for ${selected.id}.`);
    setActivityLog((current) => [
      createActivityEntry(`Contact workflow opened for ${selected.carrier} / ${selected.trackingId}.`),
      ...current,
    ]);
  }

  function handleMarkCarrierResponded() {
    const updated = {
      ...selected,
      lastUpdate: `Carrier response logged for ${selected.trackingId}. Dispatch confirmed the latest route checkpoint.`,
      nextStep:
        selected.status === "Exception"
          ? "Admin should resolve the exception once access, timing, or document blockers are confirmed."
          : selected.nextStep,
    };

    updateShipment(updated);
    setActionNotice(`Carrier response logged for ${selected.id}.`);
    setActivityLog((current) => [createActivityEntry(`Carrier response logged for ${selected.carrier}.`), ...current]);
  }

  function handleResolveException() {
    if (selected.status !== "Exception") {
      setActionNotice(`${selected.id} has no active logistics exception to resolve.`);
      setActivityLog((current) => [
        createActivityEntry(`Exception review checked for ${selected.id}; no open exception found.`),
        ...current,
      ]);
      return;
    }

    const updated = {
      ...selected,
      status: "In transit" as const,
      eta: "Updated ETA pending carrier confirmation",
      lastUpdate: "Exception resolved by admin; facility access confirmed with carrier dispatch.",
      nextStep: "Carrier can resume pickup and send the next tracking checkpoint.",
      route: [...selected.route, "Admin exception clearance logged"],
    };

    updateShipment(updated);
    setCarrierContact(null);
    setActionNotice(`${selected.id} exception resolved and shipment moved back to In transit.`);
    setActivityLog((current) => [createActivityEntry(`Resolved logistics exception for ${selected.id}.`), ...current]);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50">
      <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              Logistics control tower
            </p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">
              Carrier integrations, routing, cost, tracking, and delivery oversight.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Admin view for monitoring all platform shipments, resolving logistics exceptions,
              managing carrier integrations, and enforcing carbon-optimized routing rules.
            </p>
          </div>
          <Button type="button" variant="primary" size="md" onClick={openAddCarrierForm}>
            Add carrier integration
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric label="Active shipments" value={String(carrierActiveCount)} icon={Truck} />
          <Metric label="Exceptions" value={String(exceptionCount)} icon={AlertTriangle} />
          <Metric label="CO2 avoided" value={routeOptimizationSummary.carbonAvoided} icon={Leaf} />
          <Metric label="Quote response" value={routeOptimizationSummary.averageQuoteTime} icon={RadioTower} />
        </div>

        <div className="mb-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="min-w-0 rounded-2xl bg-white p-4 sm:p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Platform shipments</h2>
                <p className="text-sm text-neutral-500">Real-time tracking and exception monitoring.</p>
              </div>
              <Select
                id="admin-shipment-filter"
                className="w-full sm:min-w-[180px]"
                value={filter}
                onChange={(event) => setFilter(event.target.value as ShipmentFilter)}
                options={[
                  { value: "all", label: "All shipments" },
                  { value: "exceptions", label: "Exceptions" },
                  { value: "delivered", label: "Delivered" },
                  { value: "active", label: "Active shipments" },
                ]}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="text-left text-sm text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>
                    <th className="pb-3 font-medium">Shipment</th>
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Carrier</th>
                    <th className="pb-3 font-medium">Lane</th>
                    <th className="pb-3 font-medium">Cost</th>
                    <th className="pb-3 font-medium">Carbon</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(shipment)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected(shipment);
                        }
                      }}
                      className={`cursor-pointer text-sm hover:bg-neutral-50 ${
                        selected.id === shipment.id ? "bg-neutral-50" : ""
                      }`}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                    >
                      <td className="py-4 font-mono text-neutral-900">{shipment.id}</td>
                      <td className="py-4 text-neutral-700">{shipment.orderId}</td>
                      <td className="py-4 text-neutral-700">{shipment.carrier}</td>
                      <td className="py-4 text-neutral-700">{shipment.origin} to {shipment.destination}</td>
                      <td className="py-4 text-neutral-700">{shipment.cost}</td>
                      <td className="py-4 text-neutral-700">{shipment.carbonKg} kg</td>
                      <td className="py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          shipment.status === "Exception"
                            ? "bg-red-50 text-red-700"
                            : shipment.status === "Delivered"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                        }`}>
                          {shipment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredShipments.length === 0 && (
                <div className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                  No shipments match this filter.
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl bg-white p-4 sm:p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-neutral-900">Exception detail</h2>
              <span className="w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                {selected.trackingId}
              </span>
            </div>
            <div className="space-y-4 text-sm">
              <Detail label="Shipment" value={`${selected.orderId} · ${selected.product}`} />
              <Detail label="Counterparties" value={`${selected.seller} to ${selected.buyer}`} />
              <Detail label="Last update" value={selected.lastUpdate} />
              <Detail label="Next step" value={selected.nextStep} />
              {actionNotice && (
                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-semibold">Latest admin action</p>
                  <p className="mt-1">{actionNotice}</p>
                </div>
              )}
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="mb-3 font-semibold text-neutral-900">Route checkpoints</p>
                {selected.route.map((stop, index) => (
                  <div key={stop} className="flex items-center gap-3 py-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-700">
                      {index + 1}
                    </span>
                    <span className="text-neutral-700">{stop}</span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleContactCarrier}>
                  Contact carrier
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleResolveException}>
                  Resolve exception
                </Button>
              </div>
              {carrierContact && (
                <div className="rounded-xl bg-neutral-950 p-4 text-white">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare className="size-4 text-green-300" />
                    <p className="font-semibold">Carrier contact workflow</p>
                  </div>
                  <p className="text-sm text-neutral-200">{carrierContact}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Button type="button" variant="secondary" size="sm" onClick={handleMarkCarrierResponded}>
                      Mark responded
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setCarrierContact(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
              {activityLog.length > 0 && (
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="mb-3 font-semibold text-neutral-900">Admin action trail</p>
                  <div className="space-y-2">
                    {activityLog.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="rounded-lg bg-white px-3 py-2 text-xs text-neutral-600">
                        {entry.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="min-w-0 rounded-2xl bg-white p-4 sm:p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Carrier integrations</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Create, edit, disable, and remove logistics carrier connections.
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={openAddCarrierForm}>
                Add carrier
              </Button>
            </div>
            {carrierFormMode && (
              <form
                onSubmit={handleCarrierSubmit}
                className="mt-5 rounded-2xl bg-neutral-50 p-4"
                style={{ border: "1px solid #E8E8E8" }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {carrierFormMode === "edit" ? "Edit carrier integration" : "Add carrier integration"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Changes are saved to this admin demo state immediately.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={closeCarrierForm}>
                    Cancel
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    id="carrier-name"
                    label="Carrier name"
                    value={carrierForm.name}
                    onChange={(event) => updateCarrierField("name", event.target.value)}
                    placeholder="Example Freight"
                  />
                  <Select
                    id="carrier-status"
                    label="Status"
                    value={carrierForm.status}
                    onChange={(event) => updateCarrierField("status", event.target.value as CarrierIntegration["status"])}
                    options={[
                      { value: "Connected", label: "Connected" },
                      { value: "Degraded", label: "Degraded" },
                      { value: "Pending", label: "Pending" },
                    ]}
                  />
                  <Input
                    id="carrier-coverage"
                    label="Coverage"
                    value={carrierForm.coverage}
                    onChange={(event) => updateCarrierField("coverage", event.target.value)}
                    placeholder="US bulk and regional"
                  />
                  <Input
                    id="carrier-response"
                    label="Average response"
                    value={carrierForm.avgResponse}
                    onChange={(event) => updateCarrierField("avgResponse", event.target.value)}
                    placeholder="520 ms"
                  />
                  <Input
                    id="carrier-active-shipments"
                    label="Active shipments"
                    type="number"
                    min={0}
                    value={carrierForm.activeShipments}
                    onChange={(event) => updateCarrierField("activeShipments", event.target.value)}
                  />
                  <Input
                    id="carrier-issue"
                    label="Issue or note"
                    value={carrierForm.issue}
                    onChange={(event) => updateCarrierField("issue", event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                {carrierFormError && (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {carrierFormError}
                  </p>
                )}
                <div className="mt-4 flex justify-end">
                  <Button type="submit" variant="primary" size="sm">
                    {carrierFormMode === "edit" ? "Save carrier" : "Create carrier"}
                  </Button>
                </div>
              </form>
            )}
            <div className="mt-4 grid gap-3">
              {carriers.map((carrier) => (
                <div key={carrier.name} className="rounded-xl bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{carrier.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">{carrier.coverage}</p>
                      {carrier.issue && <p className="mt-1 text-xs text-amber-700">{carrier.issue}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-neutral-900">{carrier.activeShipments} active</p>
                      <p className="text-neutral-500">{carrier.avgResponse}</p>
                      <p className={`mt-1 font-semibold ${
                        carrier.status === "Connected" ? "text-green-700" : carrier.status === "Degraded" ? "text-amber-700" : "text-neutral-500"
                      }`}>
                        {carrier.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEditCarrierForm(carrier)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleDeleteCarrier(carrier)}>
                      {deleteCandidate === carrier.name ? "Confirm delete" : "Delete"}
                    </Button>
                    {deleteCandidate === carrier.name && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteCandidate(null)}>
                        Keep
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {carriers.length === 0 && (
                <div className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                  No carrier integrations yet. Add one to start routing shipments.
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl bg-white p-4 sm:p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h2 className="text-xl font-bold text-neutral-900">Routing configuration</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Demo settings for carrier selection and sustainable routing rules.
            </p>
            <div className="mt-5 space-y-4">
              <RoutingRule icon={Leaf} title="Prefer lowest-carbon route" detail="Auto-select when cost delta is under 8%." />
              <RoutingRule icon={Route} title="Require carrier insurance" detail="Block booking if cargo coverage is missing." />
              <RoutingRule icon={CheckCircle2} title="Automated release trigger" detail="Carrier delivery confirmation starts buyer inspection window." />
              <RoutingRule icon={Settings2} title="Manual admin override" detail="Allow operations team to switch carriers on exceptions." />
            </div>
            <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">Optimization impact</p>
              <p className="mt-1">
                {routeOptimizationSummary.optimizedShipments} shipments optimized,
                saving {routeOptimizationSummary.monthlySavings} this month.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-neutral-900">{value}</p>
    </div>
  );
}

function RoutingRule({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4">
      <Icon className="mt-0.5 size-5 text-neutral-500" />
      <div>
        <p className="font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 text-sm text-neutral-500">{detail}</p>
      </div>
    </div>
  );
}
