"use client";

import { useParams } from "next/navigation";
import ManifiestoForm from "@/components/ManifiestoForm";

export default function EditarManifiestoPage() {
  const params = useParams<{ id: string }>();
  return <ManifiestoForm manifiestoId={params.id} />;
}
