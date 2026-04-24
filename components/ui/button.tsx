import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-teal-700 text-white hover:bg-teal-800"
      : variant === "secondary"
        ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
        : "bg-transparent text-slate-700 hover:bg-slate-100";

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${variantClass} ${className}`}
      {...props}
    />
  );
}
