import { cn } from "./utils";

function Badge({
  className,
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium leading-4 text-neutral-700",
        className,
      )}
      style={{ backgroundColor: "#F0F0F0", ...style }}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
