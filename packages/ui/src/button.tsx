import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-bold tracking-[0.5px] whitespace-nowrap transition-colors hover:opacity-90 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-neutral-900 text-white",
        secondary: "border border-neutral-900 text-neutral-900 bg-transparent",
        ghost: "text-white bg-transparent",
        "outline-white": "border border-white text-white bg-transparent",
        white: "bg-white text-neutral-900",
      },
      size: {
        sm: "px-5 py-2 text-sm leading-5 gap-2",
        md: "px-6 py-3 text-base leading-6 gap-3",
        lg: "px-8 py-4 text-lg leading-7 gap-3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
