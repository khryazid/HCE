import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  open: boolean;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, open, children, onClose }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <section className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-lg">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[color:var(--ink)]">{title}</h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-[color:var(--ink-soft)] hover:bg-[color:var(--bg-soft)]"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
