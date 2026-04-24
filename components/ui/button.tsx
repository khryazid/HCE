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
      ? "hce-btn-primary"
      : variant === "secondary"
        ? "hce-btn-secondary border-0 bg-slate-100 text-slate-900 hover:bg-slate-200"
        : "hce-btn border-0 bg-transparent text-slate-700 hover:bg-slate-100";

  return (
    <button
      className={`${variantClass} ${className}`}
      {...props}
    />
  );
}
