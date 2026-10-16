import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/empresa/theme/theme-script";
import { ThemeProvider } from "@/components/empresa/theme/theme-provider";
import "@/components/portal/portal.css";

export const metadata: Metadata = {
  title: { default: "Encuesta · Pime", template: "%s · Pime" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F4F6FA" }, { media: "(prefers-color-scheme: dark)", color: "#060E1E" }], width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Encuesta pública de satisfacción: mismo marco y tema que las pantallas de acceso de la cuenta del cliente. */
export default function EncuestaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeScript />
      <ThemeProvider><div className="portal-app">{children}</div></ThemeProvider>
    </>
  );
}
