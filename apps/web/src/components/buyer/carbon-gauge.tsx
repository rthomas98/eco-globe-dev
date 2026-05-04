"use client";

export interface GaugeMarker {
  label: string;
  value: number;
  color: string;
  /** Optional dashed line — used for the user's target. */
  dashed?: boolean;
}

interface Props {
  title?: string;
  markers: GaugeMarker[];
  unit?: string;
  /**
   * Optional fixed maximum. If omitted, scales to 1.25x the largest marker.
   */
  max?: number;
}

/**
 * Horizontal carbon-footprint gauge: a continuous scale with labeled tick markers
 * (Feedstock scenarios, User target, Business as Usual, etc).
 *
 * Mirrors the layout shown in the product PPT (slides 14, 17, 20, 21).
 */
export function CarbonGauge({
  title = "Estimated Transportation Carbon footprint",
  markers,
  unit = "t CO₂eq",
  max,
}: Props) {
  const safeMarkers = markers.filter((m) => Number.isFinite(m.value));
  const computedMax =
    max ??
    Math.max(0.5, ...safeMarkers.map((m) => m.value)) * 1.25;
  const ticks = makeTicks(computedMax);

  // Stagger labels above/below to avoid overlap when markers are close.
  const sorted = [...safeMarkers].sort((a, b) => a.value - b.value);
  const placement = new Map<GaugeMarker, "above" | "below">();
  sorted.forEach((m, i) => placement.set(m, i % 2 === 0 ? "above" : "below"));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-bold text-neutral-900">{title}</p>

      <div className="relative pt-12 pb-12">
        {/* Track */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-emerald-100 via-amber-100 to-rose-200">
          {/* tick marks */}
          {ticks.map((t) => {
            const left = (t / computedMax) * 100;
            return (
              <div
                key={t}
                className="absolute top-0 h-full w-px bg-white/70"
                style={{ left: `${left}%` }}
              />
            );
          })}
        </div>

        {/* Tick value labels */}
        <div className="relative mt-1 h-4 w-full text-[10px] text-neutral-500">
          {ticks.map((t) => {
            const left = (t / computedMax) * 100;
            return (
              <span
                key={t}
                className="absolute -translate-x-1/2"
                style={{ left: `${left}%` }}
              >
                {formatTick(t)}
              </span>
            );
          })}
        </div>

        {/* Markers */}
        {safeMarkers.map((m) => {
          const left = clampPct((m.value / computedMax) * 100);
          const above = placement.get(m) === "above";
          return (
            <div
              key={m.label}
              className="absolute flex flex-col items-center"
              style={{
                left: `${left}%`,
                top: above ? 0 : "auto",
                bottom: above ? "auto" : 0,
                transform: "translateX(-50%)",
              }}
            >
              {above && (
                <div className="mb-1 flex flex-col items-center text-center">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ background: m.color }}
                  >
                    {m.label}
                  </span>
                  <span className="mt-0.5 text-[10px] font-bold text-neutral-900">
                    {m.value.toFixed(2)} {unit}
                  </span>
                </div>
              )}
              <div
                className="h-8 w-[2px]"
                style={{
                  background: m.color,
                  borderLeft: m.dashed ? `2px dashed ${m.color}` : undefined,
                  backgroundColor: m.dashed ? "transparent" : m.color,
                }}
              />
              {!above && (
                <div className="mt-1 flex flex-col items-center text-center">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ background: m.color }}
                  >
                    {m.label}
                  </span>
                  <span className="mt-0.5 text-[10px] font-bold text-neutral-900">
                    {m.value.toFixed(2)} {unit}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function clampPct(v: number) {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function makeTicks(max: number): number[] {
  if (max <= 0) return [0];
  // 5 evenly-spaced ticks
  const step = max / 4;
  return [0, step, step * 2, step * 3, max].map((v) => round(v));
}

function round(v: number): number {
  if (v >= 100) return Math.round(v);
  if (v >= 10) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}

function formatTick(v: number): string {
  if (v === 0) return "0";
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
