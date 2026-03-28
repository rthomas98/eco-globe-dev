import { cn } from "./utils";

function Badge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-black/6 px-2 py-1 text-xs font-medium leading-4 text-neutral-800",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
