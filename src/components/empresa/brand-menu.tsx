"use client";

import Image from "next/image";

interface BrandMenuProps {
  companyName: string;
  logoSrc: string;
  onLogoError: () => void;
}

/**
 * Cabecera de marca del sidebar. El tema ya no vive aquí: está a la vista en el pie de la barra lateral
 * (antes quedaba escondido en este menú).
 */
export function BrandMenu({ companyName, logoSrc, onLogoError }: BrandMenuProps) {
  return (
    <div className="relative min-w-0 flex-1 flex items-center gap-2 py-1.5">
      <div className="relative w-8 h-8 rounded-md bg-brand/10 border border-brand/25 flex items-center justify-center shrink-0 overflow-hidden">
        <Image src={logoSrc} alt={companyName} fill sizes="32px" className="object-contain p-0.5" unoptimized={logoSrc.endsWith(".svg")} onError={onLogoError} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-fg text-xs font-semibold tracking-widest uppercase truncate">{companyName}</p>
        <p className="text-brand-fg text-[10px] tracking-[0.25em] uppercase mt-0.5">Suite</p>
      </div>
    </div>
  );
}
