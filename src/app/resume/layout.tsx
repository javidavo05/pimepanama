import type { Metadata } from "next";
import { Syne } from "next/font/google";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Javier Vallejo — Resume",
  description:
    "CEO, Senior Software Developer & Technology Solutions Architect. Panama City, Panama.",
};

const printCSS = `
@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.ticker-track {
  animation: ticker-scroll 45s linear infinite;
}
.hero-name::after {
  content: '';
  display: block;
  width: 0;
  height: 2px;
  background: #C8A96E;
  animation: underline-reveal 1.2s ease-out 0.6s forwards;
}
@keyframes underline-reveal {
  to { width: 100%; }
}

@media print {
  @page {
    margin: 1.4cm;
    size: A4;
  }

  /* Hide the entire animated on-screen experience */
  main, .no-print, .ticker-container { display: none !important; }

  /* Reveal the dedicated print document */
  #print-resume { display: block !important; }
  #print-resume * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-shadow: none !important;
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  html, body {
    background: #ffffff !important;
    background-image: none !important;
    color: #1C1C1C !important;
  }

  #print-resume section,
  #print-resume header { break-inside: avoid; page-break-inside: avoid; }
  #print-resume h1, #print-resume h2 { break-after: avoid; page-break-after: avoid; }
}

/* Keep the print document out of the screen flow */
@media screen {
  #print-resume { display: none !important; }
}
`;

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={syne.variable}>
      <style dangerouslySetInnerHTML={{ __html: printCSS }} />
      {children}
    </div>
  );
}
