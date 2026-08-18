import type { Metadata } from "next";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { SidebarNav } from "@/components/empresa/sidebar-nav";
import { resolveCompanyLogoUrl } from "@/lib/company-logo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getEmpresaUser();
  const companyName = user.config?.name ?? "Pime Suite";

  return {
    title: { template: `%s — ${companyName}`, default: companyName },
    // Icons inherited from parent empresa/layout.tsx (static /icons/* only).
  };
}

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
        logoUrl={resolveCompanyLogoUrl(user.config?.logoUrl)}
      />
      <main className="pt-14 md:pt-0 md:ml-60 min-h-screen">
        <div className="p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
