import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Tu cuenta · Pime", template: "%s · Pime" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#F4F6FA", width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Cuenta del cliente: tema claro propio (.portal-app). La línea Premium se activa en (privado). */
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-app">{children}</div>;
}
