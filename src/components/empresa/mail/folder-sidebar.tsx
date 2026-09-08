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
                ? "bg-brand/10 border-brand/25 text-brand-fg"
                : "border-line text-fg-dim hover:text-fg-soft hover:bg-fill"
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
              ? "bg-brand/10 text-brand-fg border border-brand/20"
              : "text-fg-faint hover:text-fg-soft hover:bg-fill border border-transparent"
          }`}
        >
          <span className="text-base w-5 text-center">{icon}</span>
          <span className="flex-1 truncate">{label}</span>
          {count > 0 && (
            <span className="text-[10px] font-mono text-fg-ghost">{count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
