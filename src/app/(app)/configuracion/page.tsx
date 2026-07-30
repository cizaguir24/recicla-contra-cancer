import Link from "next/link";
import { Users, ShieldCheck, FileText } from "lucide-react";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configuración</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/configuracion/usuarios"
          className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 hover:bg-white/60"
        >
          <Users className="h-5 w-5 text-[var(--brand-blue)]" />
          <div>
            <p className="font-medium">Usuarios</p>
            <p className="text-sm text-foreground/60">Altas, bajas y asignación de rol</p>
          </div>
        </Link>
        <Link
          href="/configuracion/roles"
          className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 hover:bg-white/60"
        >
          <ShieldCheck className="h-5 w-5 text-[var(--brand-blue)]" />
          <div>
            <p className="font-medium">Roles</p>
            <p className="text-sm text-foreground/60">Define roles y sus permisos</p>
          </div>
        </Link>
        <Link
          href="/configuracion/manifiestos"
          className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 hover:bg-white/60"
        >
          <FileText className="h-5 w-5 text-[var(--brand-blue)]" />
          <div>
            <p className="font-medium">Plantilla de Manifiesto</p>
            <p className="text-sm text-foreground/60">Texto predeterminado inicial y de cierre</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
