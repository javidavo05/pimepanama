"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type ContactFormProps = {
  locale: "en" | "es";
};

export function ContactForm({ locale }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const labels = {
    en: {
      title: "Request Free Technical Assessment",
      subtitle: "Share your project requirements and receive expert recommendations within 24 hours",
      name: "Full Name",
      email: "Email Address",
      company: "Company Name",
      phone: "Phone Number",
      message: "Project Details",
      submit: "Send Request",
      submitting: "Sending...",
      success: "Thank you! We'll contact you within 24 hours.",
      errorMsg: "Error sending message. Please email us directly at info@pimepanama.com",
    },
    es: {
      title: "Solicite Evaluación Técnica Gratuita",
      subtitle: "Comparta los requerimientos de su proyecto y reciba recomendaciones expertas en 24 horas",
      name: "Nombre Completo",
      email: "Correo Electrónico",
      company: "Nombre de la Empresa",
      phone: "Número de Teléfono",
      message: "Detalles del Proyecto",
      submit: "Enviar Solicitud",
      submitting: "Enviando...",
      success: "¡Gracias! Nos pondremos en contacto en 24 horas.",
      errorMsg: "Error al enviar mensaje. Por favor escríbanos directamente a info@pimepanama.com",
    },
  };

  const t = labels[locale];

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
      setError(t.errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center backdrop-blur"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-white">{t.success}</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm text-white/60 underline hover:text-white"
        >
          {locale === "en" ? "Send another request" : "Enviar otra solicitud"}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold text-white md:text-3xl">{t.title}</h3>
        <p className="text-sm text-white/60">{t.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm text-white/60">
              {t.name} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder={locale === "en" ? "John Doe" : "Juan Pérez"}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-white/60">
              {t.email} *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder={locale === "en" ? "john@company.com" : "juan@empresa.com"}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="company" className="mb-2 block text-sm text-white/60">
              {t.company}
            </label>
            <input
              type="text"
              id="company"
              name="company"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder={locale === "en" ? "Company Inc." : "Empresa S.A."}
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm text-white/60">
              {t.phone}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="+507 6000-0000"
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="mb-2 block text-sm text-white/60">
            {t.message} *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 backdrop-blur transition focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
            placeholder={
              locale === "en"
                ? "Describe your project requirements, timeline, and any specific technical needs..."
                : "Describa los requerimientos de su proyecto, cronograma y necesidades técnicas específicas..."
            }
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t.submitting : t.submit}
        </button>

        <p className="text-center text-xs text-white/40">
          {locale === "en" ? "Or email us directly at" : "O escríbanos directamente a"}{" "}
          <a href="mailto:info@pimepanama.com" className="text-white/60 underline hover:text-white">
            info@pimepanama.com
          </a>
        </p>
      </form>
    </div>
  );
}

