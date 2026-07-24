import { auth, signOut } from "@/auth";
import AppShell from "@/components/AppShell";
import { PERMISOS_VACIOS } from "@/lib/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userLabel = session?.user?.name ?? session?.user?.email ?? "";
  const permisos = session?.user?.permisos ?? PERMISOS_VACIOS;

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AppShell userLabel={userLabel} permisos={permisos} signOutAction={signOutAction}>
      {children}
    </AppShell>
  );
}
