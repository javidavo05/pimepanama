import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/empresa/theme/theme-script";
import { ThemeProvider } from "@/components/empresa/theme/theme-provider";
import "@/components/portal/portal.css";

export const metadata: Metadata = {
  title: { default: "Tu cuenta · Pime", template: "%s · Pime" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F4F6FA" }, { media: "(prefers-color-scheme: dark)", color: "#060E1E" }], width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Cuenta del cliente: claro, oscuro o el del sistema (lo elige el cliente en Cuenta). La línea Premium se activa en (privado). */
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeScript />
      <ThemeProvider><div className="portal-app">{children}</div></ThemeProvider>
    </>
  );
}
