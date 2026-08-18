"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

interface UnreadBadgeProps {
  count: number;
  active: boolean;
  searchParams: {
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    tag?: string;
    filter?: string;
    folder?: string;
  };
}

export function UnreadBadge({ count, active, searchParams }: UnreadBadgeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  if (count <= 0) return null;

  function toggleUnread() {
    const nextFilter = active ? "" : "unread";
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.dateFrom) params.set("dateFrom", searchParams.dateFrom);
    if (searchParams.dateTo) params.set("dateTo", searchParams.dateTo);
    if (searchParams.tag) params.set("tag", searchParams.tag);
    if (nextFilter) params.set("filter", nextFilter);
    if (searchParams.folder) params.set("folder", searchParams.folder);
    const qs = params.toString();
    startTransition(() => router.push(pathname + (qs ? "?" + qs : "")));
  }

  return (
    <button
      type="button"
      onClick={toggleUnread}
      title={active ? "Quitar filtro de no leídos" : "Ver solo no leídos (todas las bandejas)"}
      className={`text-xs rounded-full px-2 py-0.5 font-medium transition-all ${
        active
          ? "bg-[#1AA7F0]/30 text-[#1AA7F0] border border-[#1AA7F0]/40 ring-1 ring-[#1AA7F0]/20"
          : "bg-[#1AA7F0]/20 text-[#1AA7F0] hover:bg-[#1AA7F0]/30"
      }`}
    >
      {count} sin leer
    </button>
  );
}
