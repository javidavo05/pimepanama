"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import { LanguageToggle } from "./language-toggle";

type NavigationItem = {
  label: string;
  href: string;
};

export function NavigationBar({
  locale,
  items,
}: {
  locale: Locale;
  items: NavigationItem[];
}) {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const quoteLabel = locale === "es" ? "Cotizar" : "Quote";

  return (
    <motion.header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      animate={{
        paddingTop: scrolled ? "10px" : "16px",
        paddingBottom: scrolled ? "10px" : "16px",
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        background: scrolled ? "rgba(3,6,17,0.94)" : "rgba(3,6,17,0.82)",
        borderColor: "rgba(37,99,235,0.15)",
        boxShadow: scrolled
          ? "0 1px 0 rgba(37,99,235,0.25), 0 8px 32px rgba(3,6,17,0.8)"
          : "0 1px 0 rgba(37,99,235,0.15), 0 4px 20px rgba(37,99,235,0.05)",
      }}
    >
      {/* Blue gradient accent line at very top */}
      <div
        className="absolute left-0 right-0 top-0 h-[1.5px]"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, #4F46E5 20%, #2563EB 50%, #0EA5E9 80%, transparent 100%)",
          opacity: scrolled ? 0.8 : 0.5,
        }}
      />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-85">
          <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Image
              src="/pime-icon.svg"
              alt="Pime Panamá — Empresa de Desarrollo de Software en Panama"
              width={40}
              height={40}
              className="h-9 w-9 drop-shadow-[0_0_8px_rgba(37,99,235,0.4)] sm:h-11 sm:w-11"
            />
          </motion.div>
          <div>
            <p className="text-sm font-bold tracking-widest text-white sm:text-base">
              PIME{" "}
              <span className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent">
                PANAMÁ
              </span>
            </p>
            <p className="hidden text-[0.6rem] uppercase tracking-[0.35em] text-[#60A5FA]/55 sm:block">
              {t("tagline")}
            </p>
          </div>
        </Link>

        {/* Desktop nav items */}
        <nav className="hidden items-center gap-0.5 text-[0.6rem] uppercase tracking-[0.22em] lg:flex xl:text-[0.62rem] xl:tracking-[0.28em]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative whitespace-nowrap rounded-full px-3 py-2 text-white/45 transition-all duration-200 hover:text-white xl:px-3.5"
            >
              <span
                className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)" }}
              />
              <span className="relative">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right: CTA + Lang toggle + hamburger */}
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {/* Desktop CTA appears on scroll */}
          <AnimatePresence>
            {scrolled && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.85, width: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden overflow-hidden lg:block"
              >
                <Link
                  href="#contact"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition hover:shadow-[0_0_28px_rgba(37,99,235,0.5)]"
                  style={{
                    background: "linear-gradient(135deg, #4F46E5, #2563EB, #0EA5E9)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {quoteLabel}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden sm:block">
            <LanguageToggle currentLocale={locale} />
          </div>

          {/* Hamburger — mobile/tablet only */}
          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border lg:hidden"
            style={{ borderColor: "rgba(37,99,235,0.25)", background: "rgba(37,99,235,0.06)" }}
          >
            <span className="sr-only">Menu</span>
            <div className="relative h-4 w-5">
              <motion.span
                className="absolute left-0 block h-[2px] w-5 rounded-full bg-white"
                animate={menuOpen ? { top: 7, rotate: 45 } : { top: 1, rotate: 0 }}
                transition={{ duration: 0.25 }}
              />
              <motion.span
                className="absolute left-0 top-[7px] block h-[2px] w-5 rounded-full bg-white"
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="absolute left-0 block h-[2px] w-5 rounded-full bg-white"
                animate={menuOpen ? { top: 7, rotate: -45 } : { top: 13, rotate: 0 }}
                transition={{ duration: 0.25 }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 top-0 z-[-1] bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute left-0 right-0 top-full origin-top border-b px-5 py-6 lg:hidden"
              style={{
                background: "rgba(3,6,17,0.98)",
                borderColor: "rgba(37,99,235,0.15)",
                boxShadow: "0 24px 48px -16px rgba(0,0,0,0.7)",
              }}
            >
              <div className="mx-auto flex max-w-6xl flex-col gap-1">
                {items.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-white/70 transition hover:bg-[#2563EB]/10 hover:text-white"
                    >
                      {item.label}
                      <span className="text-[#60A5FA]/50">→</span>
                    </Link>
                  </motion.div>
                ))}

                <div className="mt-4 flex items-center justify-between gap-4 border-t pt-5" style={{ borderColor: "rgba(37,99,235,0.12)" }}>
                  <LanguageToggle currentLocale={locale} />
                  <Link
                    href="#contact"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                    style={{ background: "linear-gradient(135deg, #4F46E5, #2563EB, #0EA5E9)" }}
                  >
                    {quoteLabel}
                  </Link>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
