import type { Metadata } from "next";
import { PwaRegister } from "@/components/empresa/pwa-register";
import { ThemeScript } from "@/components/empresa/theme/theme-script";
import { ThemeProvider } from "@/components/empresa/theme/theme-provider";
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
      {/* Antes que nada: fija el tema en <html> para que no haya flash. */}
      <ThemeScript />
      <PwaRegister />
      {/* `empresa-app` acota los tokens de tema a la suite; la landing pública
          comparte documento y tiene que seguir oscura sin importar la
          preferencia guardada. */}
      <ThemeProvider>
        <div className="empresa-app min-h-screen">{children}</div>
      </ThemeProvider>
    </>
  );
}
