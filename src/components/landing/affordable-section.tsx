"use client";

import { useTranslations } from "next-intl";
import { AffordableCard } from "./affordable-card";

export function AffordableSection() {
  const t = useTranslations("affordable");

  const WHATSAPP_NUMBER = "50764795352";
  const whatsappMsg = encodeURIComponent(t("cta.whatsapp_message"));
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`;

  const packages = [
    { key: "landing" as const, isPopular: false },
    { key: "booking" as const, isPopular: true },
    { key: "business" as const, isPopular: false },
  ];

  return (
    <section
      id="websites"
      className="relative overflow-hidden border-b border-white/10 px-6 py-24 text-white"
      style={{ background: "linear-gradient(180deg, #030611 0%, #04050c 50%, #030611 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.07),_transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-6xl space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">{t("eyebrow")}</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mx-auto max-w-2xl text-base text-white/55">{t("subtitle")}</p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map(({ key, isPopular }) => {
            const features = t.raw(`packages.${key}.features`) as string[];
            const useCases =
              key === "booking"
                ? (t.raw("packages.booking.use_cases") as string)
                : undefined;
            const badge = isPopular ? t("popular_badge") : undefined;

            return (
              <AffordableCard
                key={key}
                name={t(`packages.${key}.name`)}
                price={t(`packages.${key}.price`)}
                priceNote={t("price_note")}
                supportPrice={t(`packages.${key}.support_price`)}
                supportLabel={t("support_label")}
                target={t(`packages.${key}.target`)}
                description={t(`packages.${key}.description`)}
                features={features}
                useCases={useCases}
                badge={badge}
                isPopular={isPopular}
              />
            );
          })}
        </div>

        {/* CTA block */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <h3 className="text-xl font-bold text-white">{t("cta.title")}</h3>
          <p className="mt-2 text-sm text-white/55">{t("cta.body")}</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#16a34a] to-[#15803d] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(22,163,74,0.35)] transition hover:shadow-[0_0_40px_rgba(22,163,74,0.5)]"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t("cta.button")}
          </a>
        </div>

        {/* Monthly support explainer */}
        <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-white/30">
          {t("support_note")}
        </p>
      </div>
    </section>
  );
}
