import type { Metadata } from "next";
import { PwaRegister } from "@/components/empresa/pwa-register";
import { EMPRESA_FAVICON_ICONS } from "@/lib/company-logo";

/** Static metadata only — no force-dynamic here (avoids Turbopack metadata-route races on /empresa). */
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Pime Suite",
    statusBarStyle: "black-translucent",
  },
  icons: EMPRESA_FAVICON_ICONS,
};

export default function EmpresaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PwaRegister />
      {children}
    </>
  );
}
