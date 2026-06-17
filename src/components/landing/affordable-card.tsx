"use client";

type AffordableCardProps = {
  name: string;
  price: string;
  priceNote: string;
  supportPrice: string;
  supportLabel: string;
  target: string;
  description: string;
  features: string[];
  useCases?: string;
  badge?: string;
  isPopular?: boolean;
};

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function AffordableCard({
  name,
  price,
  priceNote,
  supportPrice,
  supportLabel,
  target,
  description,
  features,
  useCases,
  badge,
  isPopular = false,
}: AffordableCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white/[0.03] p-6 backdrop-blur transition-all duration-300 hover:bg-white/[0.05] ${
        isPopular
          ? "border-[#C8A96E]/60 shadow-[0_0_40px_rgba(200,169,110,0.15)]"
          : "border-white/10"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-[#C8A96E]/50 bg-[#0a0a0a] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#C8A96E]">
            {badge}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">{target}</p>
          <h3 className="mt-1 text-lg font-bold text-white">{name}</h3>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold ${isPopular ? "text-[#C8A96E]" : "text-white"}`}>
            {price}
          </span>
          <span className="text-xs text-white/40">{priceNote}</span>
        </div>

        <p className="text-sm leading-relaxed text-white/55">{description}</p>

        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
              <CheckIcon />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {useCases && (
          <p className="text-xs italic leading-relaxed text-white/35">{useCases}</p>
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="text-xs text-white/35">
          <span className="font-semibold text-white/50">{supportPrice}</span>{" "}
          {supportLabel}
        </p>
      </div>
    </div>
  );
}
