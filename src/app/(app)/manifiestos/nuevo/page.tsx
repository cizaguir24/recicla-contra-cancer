"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ManifiestoForm from "@/components/ManifiestoForm";

function NuevoManifiestoContenido() {
  const searchParams = useSearchParams();
  const puntoAcopioId = searchParams.get("puntoAcopioId") ?? undefined;
  return <ManifiestoForm puntoAcopioIdInicial={puntoAcopioId} />;
}

export default function NuevoManifiestoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-foreground/60">Cargando...</p>}>
      <NuevoManifiestoContenido />
    </Suspense>
  );
}
