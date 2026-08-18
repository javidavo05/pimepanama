"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  CANONICAL_FOLDERS,
  FOLDER_ICONS,
  FOLDER_LABELS,
  folderToUrlParam,
  type CanonicalFolder,
} from "@/lib/mail/folders";

interface FolderSidebarProps {
  activeFolder: CanonicalFolder;
  counts: Record<CanonicalFolder, number>;
  layout?: "sidebar" | "chips";
}

export function FolderSidebar({ activeFolder, counts, layout = "sidebar" }: FolderSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function selectFolder(folder: CanonicalFolder) {
    const params = new URLSearchParams(searchParams.toString());
    if (folder === "INBOX") params.delete("folder");
    else params.set("folder", folderToUrlParam(folder));
    const qs = params.toString();
    startTransition(() => router.push(pathname + (qs ? `?${qs}` : "")));
  }

  const items = CANONICAL_FOLDERS.map((f) => ({
    folder: f,
    label: FOLDER_LABELS[f],
    icon: FOLDER_ICONS[f],
    count: counts[f] ?? 0,
  }));

  if (layout === "chips") {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {items.map(({ folder, label, icon, count }) => (
          <button
            key={folder}
            type="button"
            onClick={() => selectFolder(folder)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap border transition-all shrink-0 ${
              activeFolder === folder
                ? "bg-[#1AA7F0]/10 border-[#1AA7F0]/25 text-[#1AA7F0]"
                : "border-white/[0.07] text-white/55 hover:text-white/75 hover:bg-white/[0.03]"
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            {count > 0 && (
              <span className="text-[10px] font-mono opacity-70">{count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="space-y-0.5 py-2">
      {items.map(({ folder, label, icon, count }) => (
        <button
          key={folder}
          type="button"
          onClick={() => selectFolder(folder)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
            activeFolder === folder
              ? "bg-[#1AA7F0]/10 text-[#1AA7F0] border border-[#1AA7F0]/20"
              : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <span className="text-base w-5 text-center">{icon}</span>
          <span className="flex-1 truncate">{label}</span>
          {count > 0 && (
            <span className="text-[10px] font-mono text-white/40">{count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
