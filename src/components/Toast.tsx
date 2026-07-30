"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export type ToastVariant = "success" | "error";

export type ToastData = { message: string; variant: ToastVariant };

const ESTILO: Record<ToastVariant, { icon: typeof CheckCircle2; border: string; iconColor: string }> = {
  success: { icon: CheckCircle2, border: "border-green-200", iconColor: "text-green-600" },
  error: { icon: XCircle, border: "border-red-200", iconColor: "text-red-600" },
};

export function Toast({
  toast,
  onClose,
  duration = 4000,
}: {
  toast: ToastData;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const { icon: Icon, border, iconColor } = ESTILO[toast.variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-[1200] flex max-w-sm items-start gap-2 rounded-xl border ${border} bg-white/90 px-4 py-3 text-sm shadow-lg shadow-black/10 backdrop-blur-md`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
      <span className="flex-1 text-[var(--foreground)]">{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
