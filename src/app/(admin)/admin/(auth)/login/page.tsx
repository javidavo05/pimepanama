import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  try {
    const admin = await getCurrentAdmin();

    if (admin) {
      redirect("/admin");
    }
  } catch (error) {
    console.error("Error checking admin auth:", error);
    // Continue to show login form even if database is unavailable
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-900 to-black px-6 py-24 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">PIME Admin Console</p>
          <h1 className="text-2xl font-semibold uppercase tracking-[0.3em]">Access</h1>
          <p className="text-sm text-white/50">Secure area for managing web content and case studies.</p>
        </div>
        {process.env.DATABASE_URL && process.env.DATABASE_URL.includes("file:") ? (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-6 text-center">
            <p className="text-sm text-yellow-200">
              ⚠️ Admin panel requires database configuration.
            </p>
            <p className="mt-2 text-xs text-yellow-300/60">
              Please configure Vercel Postgres or Supabase to enable CMS functionality.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}
        <p className="text-center text-xs text-white/30">
          Need help? Contact the platform administrator to reset credentials.
        </p>
      </div>
    </div>
  );
}

