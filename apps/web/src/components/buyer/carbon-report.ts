"use client";

import {
  TRANSPORT_LABEL,
  WEIGHT_UNIT_LABEL,
  type Recurrence,
  type TransportMode,
  type WeightUnit,
  type FeedstockState,
} from "@/lib/carbon-emissions";
import type { Listing } from "@/components/public/browse-listings";
import type { Facility } from "@/lib/demo-user";

export interface ReportScenario {
  name: string;
  listing: Listing;
  miles: number;
  metricTons: number;
  weightValue: number;
  weightUnit: WeightUnit;
  state: FeedstockState;
  mode: TransportMode | null;
  emissionTons: number;
  facilityLabel?: string;
  manualAddress?: string;
}

export interface ReportInput {
  scenarios: ReportScenario[];
  bauTons: number | null;
  targetTons: number | null;
  recurrence: Recurrence;
  recurrenceMul: number;
  buyerName?: string;
  buyerEmail?: string;
  facilities?: Facility[];
}

export function generateCarbonReport(input: ReportInput) {
  const html = renderReportHtml(input);
  // Use a Blob URL instead of document.write to avoid the XSS surface and
  // the perf issues that document.write triggers.
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "width=900,height=1200");
  if (!win) {
    alert(
      "Could not open the report window. Please allow pop-ups for this site and try again.",
    );
    URL.revokeObjectURL(url);
    return;
  }
  // Auto-trigger print once the window finishes loading. The user can then "Save as PDF".
  const onLoad = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* user can still print manually */
    }
    // Free the object URL after the new window has parsed the document.
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  // load may have already fired by the time we attach; cover both.
  win.addEventListener("load", onLoad, { once: true });
  setTimeout(() => {
    if (win.document?.readyState === "complete") onLoad();
  }, 800);
}

function renderReportHtml(input: ReportInput): string {
  const {
    scenarios,
    bauTons,
    targetTons,
    recurrence,
    recurrenceMul,
    buyerName,
    buyerEmail,
  } = input;

  const sorted = [...scenarios].sort((a, b) => a.emissionTons - b.emissionTons);
  const best = sorted[0];
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows = (cells: string[][]) =>
    cells
      .map(
        (row) =>
          `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`,
      )
      .join("");

  const inputRows = scenarios.flatMap((s, i) => {
    const origin = s.facilityLabel ?? s.manualAddress ?? "—";
    return [
      [`<strong>${escapeHtml(`Scenario ${i + 1} — ${s.name}`)}</strong>`, ""],
      ["Feedstock", escapeHtml(s.listing.title)],
      ["Pickup location", escapeHtml(s.listing.location)],
      ["Buyer origin", escapeHtml(origin)],
      ["Distance", `${s.miles.toFixed(1)} mi`],
      [
        "Volume",
        `${s.weightValue} ${WEIGHT_UNIT_LABEL[s.weightUnit]} (${s.metricTons.toFixed(2)} metric tons)`,
      ],
      ["Feedstock state", s.state],
      ["Transport mode", s.mode ? TRANSPORT_LABEL[s.mode] : "—"],
    ];
  });

  const calcRows = scenarios.map((s, i) => [
    `Scenario ${i + 1}`,
    s.mode ? TRANSPORT_LABEL[s.mode] : "—",
    `${s.metricTons.toFixed(2)} t`,
    `${s.miles.toFixed(1)} mi`,
    `${s.emissionTons.toFixed(3)} t CO₂eq`,
  ]);

  const resultRows = sorted.map((s, i) => [
    `${i === 0 ? "🥇 " : i === 1 ? "🥈 " : ""}${escapeHtml(s.name)}`,
    `${s.emissionTons.toFixed(2)} t`,
    `${(s.emissionTons * recurrenceMul).toFixed(2)} t / yr`,
    bauTons != null
      ? `${Math.max(0, (bauTons - s.emissionTons) * recurrenceMul).toFixed(2)} t`
      : "—",
  ]);

  const recList: string[] = [];
  recList.push(
    `<strong>Recommended:</strong> ${escapeHtml(best.name)} — ${best.emissionTons.toFixed(
      2,
    )} t CO₂eq per shipment.`,
  );
  if (sorted.length > 1) {
    const second = sorted[1];
    const delta = second.emissionTons - best.emissionTons;
    recList.push(
      `Switching from <em>${escapeHtml(second.name)}</em> to the recommended option saves ${delta.toFixed(
        2,
      )} t CO₂eq per shipment.`,
    );
  }
  if (bauTons != null) {
    const annualSavings = Math.max(
      0,
      (bauTons - best.emissionTons) * recurrenceMul,
    );
    recList.push(
      `Versus business-as-usual (${bauTons.toFixed(2)} t CO₂eq), expected annual savings at ${recurrence} cadence: <strong>${annualSavings.toFixed(2)} t CO₂eq</strong>.`,
    );
  }
  if (targetTons != null) {
    const meets = best.emissionTons <= targetTons;
    recList.push(
      `Target of ${targetTons.toFixed(2)} t CO₂eq is ${
        meets
          ? "<span class='good'>met</span>"
          : "<span class='warn'>not met</span>"
      } by the recommended scenario.`,
    );
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Carbon Calculator Report — ${today}</title>
  <style>
    @page { size: letter; margin: 0.6in; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
      color: #111;
      margin: 0;
      padding: 32px 36px;
      background: #fff;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1F5F3A;
      padding-bottom: 14px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 22px;
      font-weight: 700;
      color: #1F5F3A;
      letter-spacing: -0.01em;
    }
    .meta {
      text-align: right;
      font-size: 11px;
      color: #555;
      line-height: 1.5;
    }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1F5F3A;
      margin: 26px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #E5E7EB;
    }
    p { margin: 6px 0; line-height: 1.5; font-size: 12px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 4px;
      font-size: 11.5px;
    }
    th, td {
      text-align: left;
      padding: 6px 10px;
      border-bottom: 1px solid #EEE;
      vertical-align: top;
    }
    th {
      background: #F4F8F2;
      color: #111;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      background: #ECFDF5;
      color: #065F46;
      font-size: 11px;
      font-weight: 600;
      margin-right: 6px;
    }
    .summary {
      background: #F4F8F2;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 14px 16px;
      margin: 8px 0 12px;
      font-size: 12px;
    }
    .summary strong { color: #1F5F3A; }
    .good { color: #047857; font-weight: 600; }
    .warn { color: #B45309; font-weight: 600; }
    ul { padding-left: 20px; margin: 6px 0; font-size: 12px; }
    li { margin-bottom: 4px; line-height: 1.5; }
    footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #E5E7EB;
      font-size: 10.5px;
      color: #6B7280;
    }
    @media print { body { padding: 0; } .no-print { display: none !important; } }
    .actions {
      margin-bottom: 20px;
      padding: 10px 12px;
      background: #F0F9F2;
      border-radius: 8px;
      font-size: 12px;
      color: #1F5F3A;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .actions button {
      background: #1F5F3A;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="actions no-print">
    <span>📄 Report ready. Use your browser's <strong>Save as PDF</strong> in the print dialog.</span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>

  <header>
    <div>
      <div class="brand">EcoGlobe</div>
      <h1>Carbon Calculator Report</h1>
      <p style="font-size:12px;color:#444;margin:4px 0 0;">Transportation footprint analysis &amp; recommendation</p>
    </div>
    <div class="meta">
      <div><strong>Date:</strong> ${today}</div>
      ${buyerName ? `<div><strong>Prepared for:</strong> ${escapeHtml(buyerName)}</div>` : ""}
      ${buyerEmail ? `<div>${escapeHtml(buyerEmail)}</div>` : ""}
      <div><strong>Scenarios:</strong> ${scenarios.length}</div>
    </div>
  </header>

  <div class="summary">
    <strong>${escapeHtml(best.name)}</strong> is the lowest-footprint option at
    <strong>${best.emissionTons.toFixed(2)} t CO₂eq</strong> per shipment.
    ${
      bauTons != null
        ? `Annualized at ${recurrence}, that is <strong>${(best.emissionTons * recurrenceMul).toFixed(2)} t CO₂eq/yr</strong> — saving <strong>${Math.max(
            0,
            (bauTons - best.emissionTons) * recurrenceMul,
          ).toFixed(2)} t CO₂eq</strong> versus business-as-usual.`
        : ""
    }
  </div>

  <h2>1. Assumptions</h2>
  <ul>
    <li>Distances calculated as great-circle (haversine) miles between buyer origin and seller pickup location.</li>
    <li>Recurrence multiplier: <strong>${recurrence}</strong> = ×${recurrenceMul} shipments per year.</li>
    <li>Emissions follow EPA / GREET-style transportation factors per mode (kg CO₂eq per ton-mile, with empty-return adjustment for trucks).</li>
    <li>Volume capped at the seller's published quantity for each listing.</li>
    ${targetTons != null ? `<li>Target carbon footprint: <strong>${targetTons.toFixed(2)} t CO₂eq</strong> per shipment.</li>` : ""}
    ${bauTons != null ? `<li>Business-as-usual baseline: <strong>${bauTons.toFixed(2)} t CO₂eq</strong>.</li>` : ""}
  </ul>

  <h2>2. Inputs</h2>
  <table>
    <thead><tr><th>Field</th><th>Value</th></tr></thead>
    <tbody>${rows(inputRows)}</tbody>
  </table>

  <h2>3. Calculations</h2>
  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Mode</th>
        <th>Volume</th>
        <th>Distance</th>
        <th>Emissions</th>
      </tr>
    </thead>
    <tbody>${rows(calcRows)}</tbody>
  </table>

  <h2>4. Results</h2>
  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Per shipment</th>
        <th>Annualized (×${recurrenceMul})</th>
        <th>Annual savings vs BAU</th>
      </tr>
    </thead>
    <tbody>${rows(resultRows)}</tbody>
  </table>

  <h2>5. Comparison</h2>
  <p>
    Sorted lowest-to-highest. ${
      bauTons != null
        ? `Business-as-usual reference: <strong>${bauTons.toFixed(2)} t CO₂eq</strong>.`
        : "No business-as-usual baseline provided — comparison is between scenarios only."
    }
    ${
      targetTons != null
        ? ` Target: <strong>${targetTons.toFixed(2)} t CO₂eq</strong>.`
        : ""
    }
  </p>
  <ul>
    ${sorted
      .map((s, i) => {
        const meetsTarget =
          targetTons != null ? s.emissionTons <= targetTons : null;
        const tag = i === 0 ? '<span class="pill">Recommended</span>' : "";
        const tgt =
          meetsTarget == null
            ? ""
            : meetsTarget
              ? ' <span class="good">(within target)</span>'
              : ' <span class="warn">(exceeds target)</span>';
        return `<li>${tag}<strong>${escapeHtml(s.name)}</strong> — ${s.emissionTons.toFixed(
          2,
        )} t CO₂eq per shipment${tgt}.</li>`;
      })
      .join("")}
  </ul>

  <h2>6. Recommendations</h2>
  <ul>
    ${recList.map((line) => `<li>${line}</li>`).join("")}
  </ul>

  <footer>
    Generated by EcoGlobe Carbon Calculator on ${today}. Emissions estimates are illustrative
    and depend on the accuracy of buyer-supplied origin, volume, and routing inputs.
  </footer>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
