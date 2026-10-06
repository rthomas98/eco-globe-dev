/** Small "Soon" marker for features announced but not yet available. */
export function SoonPill({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span
      className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider ${
        tone === "dark" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
      }`}
    >
      Soon
    </span>
  );
}
