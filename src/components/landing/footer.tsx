"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import { SERVICES } from "@/lib/services-content";

export function LandingFooter({ locale: _locale }: { locale?: Locale }) {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t px-6 py-16"
      style={{
        background: "linear-gradient(180deg, #04050c 0%, #020308 100%)",
        borderColor: "rgba(37,99,235,0.15)",
        color: "rgba(255,255,255,0.55)",
      }}
    >
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/pime-icon.svg"
              alt="Pime Panamá Logo"
              width={48}
              height={48}
              className="h-12 w-12 drop-shadow-[0_0_6px_rgba(37,99,235,0.3)]"
            />
            <div>
              <p className="text-lg font-bold text-white">
                PIME{" "}
                <span className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent">
                  PANAMÁ
                </span>
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
                {t("tagline")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link href="/#services" className="transition hover:text-white" style={{ color: "rgba(255,255,255,0.55)" }}>
              {t("services")}
            </Link>
            <Link href="/#sectors" className="transition hover:text-white" style={{ color: "rgba(255,255,255,0.55)" }}>
              {t("sectors")}
            </Link>
            <Link href="/portfolio" className="transition hover:text-white" style={{ color: "rgba(255,255,255,0.55)" }}>
              {t("portfolio")}
            </Link>
            <Link href="/#contact" className="transition hover:text-white" style={{ color: "rgba(255,255,255,0.55)" }}>
              {t("contact")}
            </Link>
          </div>
        </div>
        {/* Enlaces a las páginas de servicio en todas las páginas del sitio:
            es lo que hace que Google las descubra y les pase autoridad desde
            la portada, que es la que concentra los enlaces externos. */}
        <nav aria-label="Servicios de desarrollo de software" className="border-t pt-8" style={{ borderColor: "rgba(37,99,235,0.12)" }}>
          <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {t("servicesNav")}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/${service.slug}`}
                  className="transition hover:text-white"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {service.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t pt-8" style={{ borderColor: "rgba(37,99,235,0.12)" }}>
          <p className="text-center text-xs uppercase tracking-[0.4em]" style={{ color: "rgba(255,255,255,0.30)" }}>
            © {currentYear} PIME Panama. {t("rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
