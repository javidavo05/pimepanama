import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { SidebarNav } from "@/components/empresa/sidebar-nav";

export const dynamic = "force-dynamic";

export default async function EmpresaProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getEmpresaUser();

  return (
    <div className="min-h-screen bg-[#050508]">
      <SidebarNav
        userEmail={user.email}
        companyName={user.config?.name ?? "Pime Panamá"}
      />
      <main className="ml-60 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
