"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
// locale prop kept for API compatibility; translations come from next-intl context

export function LandingFooter({ locale: _locale }: { locale?: Locale }) {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-gradient-to-b from-[#010510] via-[#01030a] to-[#000104] px-6 py-16 text-white/60">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/pime-icon.svg"
              alt="Pime Panamá Logo"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <div>
              <p className="text-lg font-bold text-white">PIME Panama</p>
              <p className="text-xs text-white/50">{t("tagline")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link href="/#services" className="transition hover:text-[#60A5FA]">
              {t("services")}
            </Link>
            <Link href="/#sectors" className="transition hover:text-[#60A5FA]">
              {t("sectors")}
            </Link>
            <Link href="/portfolio" className="transition hover:text-[#60A5FA]">
              {t("portfolio")}
            </Link>
            <Link href="/#contact" className="transition hover:text-[#60A5FA]">
              {t("contact")}
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-xs uppercase tracking-[0.4em] text-white/40">
            © {currentYear} PIME Panama. {t("rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
