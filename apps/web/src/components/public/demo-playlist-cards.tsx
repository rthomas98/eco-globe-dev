"use client";

import { MapPin, MapPinOff } from "lucide-react";
import { DemoEstimateBadge } from "@/components/shared/demo-estimate-badges";
import { MaterialImage } from "@/components/public/material-image";
import { DemoCalculatorActions } from "@/components/public/demo-calculator-dialog";
import { describeMaterialType } from "@/lib/demo-presentations";
import { describeUnit, formatMoney } from "@/lib/listing-format";
import {
  demoBasisLabel,
  demoGeographyLabel,
  demoMapPointKey,
  demoPriceLabel,
  demoRelationshipLabel,
  demoSourceStatusLabel,
  demoVolumeLabel,
  type DemoGeography,
  type DemoPlaylistCompany,
  type DemoPlaylistMaterial,
  type DemoPlaylistRelationship,
  type DemoValueFormatters,
} from "@/lib/demo-playlists";

/** Shared by the cards and the map popup so both show the same values. */
export const DEMO_VALUE_FORMAT: DemoValueFormatters = {
  money: (amount, currencyCode) => formatMoney(amount, currencyCode) ?? String(amount),
  unit: describeUnit,
};

export function demoMaterialElementId(id: string) {
  return `demo-material-${id}`;
}

export function demoCompanyElementId(id: string) {
  return `demo-company-${id}`;
}

export function demoNetworkElementId(companyId: string) {
  return `demo-network-${companyId}`;
}

export function GeographyLine({ geography }: { geography: DemoGeography }) {
  const label = demoGeographyLabel(geography);
  const Icon = label.pending ? MapPinOff : MapPin;
  return (
    <span className="inline-flex items-start gap-1">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${label.pending ? "text-amber-700" : "text-neutral-500"}`} aria-hidden="true" />
      <span>
        <span className={label.pending ? "font-medium text-amber-900" : undefined}>{label.headline}</span>
        {label.detail && <span className="block text-xs text-neutral-500">{label.detail}</span>}
      </span>
    </span>
  );
}

/** One material example. Presentation only: no detail, cart, quote or edit action. */
export function DemoMaterialCard({
  item,
  companyName,
  selected,
  onShowOnMap,
}: {
  item: DemoPlaylistMaterial;
  companyName: string;
  selected: boolean;
  onShowOnMap: () => void;
}) {
  const price = demoPriceLabel(item.price, DEMO_VALUE_FORMAT);
  const volume = demoVolumeLabel(item.volume, DEMO_VALUE_FORMAT);
  const badges = [
    item.price.kind === "value" ? demoBasisLabel("price", item.price.basis) : null,
    item.volume.kind === "value" ? demoBasisLabel("volume", item.volume.basis) : null,
  ].filter((label): label is string => label !== null);
  return (
    <li
      id={demoMaterialElementId(item.id)}
      className={`flex scroll-mt-28 flex-col rounded-xl bg-white p-4 ${selected ? "ring-2 ring-[#FFD600]" : ""}`}
      style={{ border: "1px solid #F0F0F0" }}
    >
      <div className="relative h-32 overflow-hidden rounded-lg bg-neutral-100">
        <MaterialImage title={item.title} />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {item.kind === "seller" ? "Seller offer" : "Buyer need"} · Presentation only
      </p>
      <h3 className="mt-1 text-base font-semibold text-neutral-900">{item.title}</h3>
      <p className="mt-0.5 text-sm text-neutral-700">{companyName}</p>
      {item.qualifier && <p className="mt-1 text-sm font-medium text-amber-900">{item.qualifier}</p>}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-neutral-500">Material</dt>
        <dd className="text-neutral-900">{describeMaterialType(item.materialTypeCode)}</dd>
        <dt className="text-neutral-500">Volume</dt>
        <dd className="text-neutral-900">{volume ?? "Not stated"}</dd>
        <dt className="text-neutral-500">{item.kind === "seller" ? "Price" : "Target price"}</dt>
        <dd className="text-neutral-900">{price ?? "Not stated"}</dd>
        <dt className="text-neutral-500">Source</dt>
        <dd className="text-neutral-900">{demoSourceStatusLabel(item.sourceStatus)}</dd>
        <dt className="text-neutral-500">Location</dt>
        <dd className="text-neutral-900">
          <GeographyLine geography={item.geography} />
        </dd>
      </dl>
      {item.equivalents.length > 0 && (
        <p className="mt-2 text-xs text-neutral-600">
          <span className="font-medium">Equivalent materials (not confirmed requirements):</span> {item.equivalents.join(", ")}
        </p>
      )}
      {badges.length > 0 && (
        <span className="mt-3 inline-flex flex-wrap gap-1">
          {badges.map((label) => (
            <DemoEstimateBadge key={label} label={label} />
          ))}
        </span>
      )}
      <div className="mt-auto flex flex-col items-start gap-3 pt-3">
        <DemoCalculatorActions material={item} companyName={companyName} />
        {item.geography.kind === "point" && (
          <button type="button" onClick={onShowOnMap} className="text-sm font-semibold text-neutral-900 underline">
            Show on map
          </button>
        )}
      </div>
    </li>
  );
}

/** The filtered material cards, or an explanatory empty state. */
export function DemoMaterialList({
  materials,
  companies,
  selectedKey,
  onShowOnMap,
  emptyMessage,
  onClearFilters,
}: {
  materials: DemoPlaylistMaterial[];
  companies: Map<string, DemoPlaylistCompany>;
  selectedKey: string | null;
  onShowOnMap: (key: string) => void;
  emptyMessage: string;
  onClearFilters: (() => void) | null;
}) {
  if (materials.length === 0)
    return (
      <div className="rounded-xl bg-neutral-50 px-6 py-12 text-center">
        <p className="text-sm font-medium text-neutral-700">{emptyMessage}</p>
        {onClearFilters && (
          <button type="button" onClick={onClearFilters} className="mt-2 text-sm font-semibold underline">
            Clear filters
          </button>
        )}
      </div>
    );
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {materials.map((item) => {
        const key = demoMapPointKey("material", item.id);
        return (
          <DemoMaterialCard
            key={item.id}
            item={item}
            companyName={companies.get(item.companyId)?.name ?? ""}
            selected={selectedKey === key}
            onShowOnMap={() => onShowOnMap(key)}
          />
        );
      })}
    </ul>
  );
}

/** A playlist company, including technology/service companies without material data. */
export function DemoCompanyProfileCard({
  company,
  materialCount,
  selected,
  onSelect,
}: {
  company: DemoPlaylistCompany;
  materialCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li
      id={demoCompanyElementId(company.id)}
      className={`flex scroll-mt-28 flex-col rounded-xl bg-white p-4 ${selected ? "ring-2 ring-neutral-900" : ""}`}
      style={{ border: "1px solid #F0F0F0" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Company profile · Presentation only</p>
      <h3 className="mt-1 text-base font-semibold text-neutral-900">{company.name}</h3>
      {company.description && <p className="mt-1 text-sm text-neutral-700">{company.description}</p>}
      <p className="mt-2 text-sm text-neutral-900">
        {company.materialState === "no_material_data"
          ? "No material examples supplied"
          : `${materialCount} material example${materialCount === 1 ? "" : "s"}`}
      </p>
      <p className="mt-1 text-sm text-neutral-700">
        <GeographyLine geography={company.geography} />
      </p>
      {!selected && (
        <button type="button" onClick={onSelect} className="mt-auto self-start pt-3 text-sm font-semibold underline">
          {company.materialState === "no_material_data" ? "Focus on this company" : "Show this company's examples"}
        </button>
      )}
    </li>
  );
}

/**
 * The selected company's profile, or every profile in a collapsed section so
 * the examples and map stay in view; each profile is one click away there and
 * in the company filter.
 */
export function DemoCompanyProfiles({
  profiles,
  selected,
  materialCounts,
  onSelect,
}: {
  profiles: DemoPlaylistCompany[];
  selected: DemoPlaylistCompany | undefined;
  materialCounts: Map<string, number>;
  onSelect: (companyId: string) => void;
}) {
  if (selected)
    return (
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:max-w-md">
        <DemoCompanyProfileCard
          company={selected}
          materialCount={materialCounts.get(selected.id) ?? 0}
          selected
          onSelect={() => undefined}
        />
      </ul>
    );
  const noMaterial = profiles.filter((company) => company.materialState === "no_material_data").length;
  return (
    <details className="mt-4 rounded-xl bg-neutral-50 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-neutral-900">
        Company profiles ({profiles.length})
        {noMaterial > 0 && <span className="font-normal text-neutral-600"> · {noMaterial} without material examples</span>}
      </summary>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {profiles.map((company) => (
          <DemoCompanyProfileCard
            key={company.id}
            company={company}
            materialCount={materialCounts.get(company.id) ?? 0}
            selected={false}
            onSelect={() => onSelect(company.id)}
          />
        ))}
      </ul>
    </details>
  );
}

/** Potential relationships: prospects only, never confirmed orders, stock or requirements. */
export function DemoRelationshipList({
  relationships,
  companies,
  onShowOnMap,
}: {
  relationships: DemoPlaylistRelationship[];
  companies: Map<string, DemoPlaylistCompany>;
  onShowOnMap: (companyId: string) => void;
}) {
  const anchored = new Set<string>();
  return (
    <section aria-labelledby="demo-network-heading" className="mt-10">
      <h2 id="demo-network-heading" className="text-lg font-semibold text-neutral-900">
        Potential network
      </h2>
      <p className="mt-1 text-sm text-neutral-700">
        Possible buyers, providers and synergies from the source research. These are prospects, not confirmed purchases,
        sales or requirements.
      </p>
      {relationships.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">No potential relationships match these filters.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100 rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          {relationships.map((item) => {
            const target = item.target.kind === "company" ? companies.get(item.target.companyId) : null;
            const targetId = target?.id;
            // The first row for a company is the map's "Show in list" target.
            const anchor = targetId && !anchored.has(targetId) ? (anchored.add(targetId), demoNetworkElementId(targetId)) : undefined;
            return (
              <li key={item.id} id={anchor} className="flex scroll-mt-28 flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3">
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-neutral-900">{companies.get(item.fromCompanyId)?.name}</span>
                  <span className="text-neutral-500"> · {demoRelationshipLabel(item.kind)}: </span>
                  <span className="text-neutral-900">{target?.name ?? (item.target.kind === "group" ? item.target.label : "")}</span>
                  <span className="block text-xs text-neutral-600">
                    {item.material}
                    {item.target.kind === "group" && " · Group, not a single company"}
                  </span>
                </span>
                {target?.geography.kind === "point" && (
                  <button
                    type="button"
                    onClick={() => onShowOnMap(target.id)}
                    className="self-start text-sm font-semibold underline sm:self-center"
                  >
                    Show on map
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
