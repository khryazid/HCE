"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  open?: boolean;
};

export default function SearchInput({ value, onChange, placeholder, open }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && ref.current) {
      // focus without using autoFocus attribute
      ref.current.focus();
    }
  }, [open]);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="hce-input"
    />
  );
}
