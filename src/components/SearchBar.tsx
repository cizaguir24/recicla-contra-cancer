"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Buscar punto de acopio…",
  debounceMs = 300,
  className = "",
}: {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}) {
  const [texto, setTexto] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTexto(value);
  }, [value]);

  function escribir(nuevo: string) {
    setTexto(nuevo);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(nuevo), debounceMs);
  }

  function limpiar() {
    setTexto("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange("");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={`relative w-full ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
      <input
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input w-full pl-9 pr-9"
      />
      {texto && (
        <button
          type="button"
          onClick={limpiar}
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
