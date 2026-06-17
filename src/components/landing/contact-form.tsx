"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";

export function ContactForm({ locale }: { locale: Locale }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("contact");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      company: formData.get("company"),
      phone: formData.get("phone"),
      message: formData.get("message"),
      locale,
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to send");

      setSubmitted(true);
      e.currentTarget.reset();
    } catch {
      setError(t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-8 text-center backdrop-blur"
        style={{
          border: "1px solid rgba(37,99,235,0.25)",
          background: "rgba(8,14,32,0.7)",
          boxShadow: "0 18px 45px -28px rgba(37,99,235,0.25)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "rgba(37,99,235,0.15)" }}
        >
          <svg className="h-8 w-8 text-[#60A5FA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-white">{t("success")}</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm text-white/60 underline hover:text-white"
        >
          {t("another")}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold text-white md:text-3xl">{t("title")}</h3>
        <p className="text-sm text-white/60">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm text-white/60">
              {t("name")} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              placeholder={t("placeholder_name")}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-white/60">
              {t("email")} *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              placeholder={t("placeholder_email")}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="company" className="mb-2 block text-sm text-white/60">
              {t("company")}
            </label>
            <input
              type="text"
              id="company"
              name="company"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              placeholder={t("placeholder_company")}
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm text-white/60">
              {t("phone")}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              placeholder="+507 6000-0000"
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="mb-2 block text-sm text-white/60">
            {t("message")} *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-[#3B82F6]/50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            placeholder={t("placeholder_message")}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-lg border-0 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #4F46E5 0%, #2563EB 50%, #0EA5E9 100%)",
            boxShadow: "0 18px 35px -20px rgba(37,99,235,0.6)",
          }}
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </motion.button>

        <p className="text-center text-xs text-white/40">
          {t("or_email")}{" "}
          <a href="mailto:info@pimepanama.com" className="text-[#60A5FA]/70 underline hover:text-white">
            info@pimepanama.com
          </a>
        </p>
      </form>
    </div>
  );
}
