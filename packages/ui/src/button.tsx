import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-bold tracking-[0.5px] whitespace-nowrap transition-colors hover:opacity-90 cursor-pointer outline-none",
  {
    variants: {
      variant: {
        primary: "bg-neutral-900 text-white",
        secondary: "text-neutral-900 bg-transparent",
        ghost: "text-white bg-transparent",
        "outline-white": "text-white bg-transparent",
        white: "bg-white text-neutral-900",
      },
      size: {
        sm: "text-sm leading-5 gap-2",
        md: "text-base leading-6 gap-3",
        lg: "text-lg leading-7 gap-3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: "8px 20px" },
  md: { padding: "12px 24px" },
  lg: { padding: "16px 32px" },
};

const variantStyles: Record<string, React.CSSProperties> = {
  secondary: { border: "1px solid #090909" },
  "outline-white": { border: "1px solid rgba(255,255,255,0.7)" },
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, style, ...props }: ButtonProps) {
  const v = variant ?? "primary";
  const s = size ?? "md";
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      style={{
        ...sizeStyles[s],
        ...variantStyles[v],
        ...style,
      }}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
