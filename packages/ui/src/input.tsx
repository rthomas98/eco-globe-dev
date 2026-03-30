import { cn } from "./utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="text-base font-medium text-neutral-900"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded-lg bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-neutral-900/20",
          className,
        )}
        style={{ border: "1px solid #E0E0E0" }}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

function Select({ label, className, id, options, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="text-base font-medium text-neutral-900"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "w-full appearance-none rounded-lg bg-white px-4 py-3 text-base text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20",
          className,
        )}
        style={{ border: "1px solid #E0E0E0" }}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { Input, Select };
export type { InputProps, SelectProps };
