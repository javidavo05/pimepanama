import type { Metadata } from "next";
import "../globals.css";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Pime Panamá",
  description: "Software a medida para empresas en Panamá.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/manrope-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('tema');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
      </head>
      <body>
        {children}
        <Reveal />
      </body>
    </html>
  );
}
