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
        ? "hce-btn-secondary"
        : "hce-btn border-0 bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--bg-soft)]";

  return (
    <button
      className={`${variantClass} ${className}`}
      {...props}
    />
  );
}
