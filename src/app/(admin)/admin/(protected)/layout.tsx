import type { ReactNode } from "react";

import { ensureAuthenticated, logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const admin = await ensureAuthenticated();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">PIME Admin</p>
            <p className="text-sm text-white/70">{admin.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-12">{children}</div>
      </main>
    </div>
  );
}

