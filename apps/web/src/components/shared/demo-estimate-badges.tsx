import { CircleDashed } from "lucide-react";
import { demoEstimateBadgeLabels, type DemoEstimateFields } from "@/lib/demo-estimates";

/** Field-specific demo estimate badges; the text carries the meaning, colour only reinforces it. */
export function DemoEstimateBadges({ fields, className = "" }: { fields: DemoEstimateFields; className?: string }) {
  const labels = demoEstimateBadgeLabels(fields);
  if (labels.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {labels.map((label) => (
        <DemoEstimateBadge key={label} label={label} />
      ))}
    </span>
  );
}

export function DemoEstimateBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
      <CircleDashed className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
