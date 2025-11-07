import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  let admin = null;
  let dbError = false;

  try {
    admin = await getCurrentAdmin();
    if (admin) {
      redirect("/admin");
    }
  } catch (error) {
    console.error("Error checking admin auth:", error);
    dbError = true;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-900 to-black px-6 py-24 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">PIME Admin Console</p>
          <h1 className="text-2xl font-semibold uppercase tracking-[0.3em]">Access</h1>
          <p className="text-sm text-white/50">Secure area for managing web content.</p>
        </div>
        {dbError ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-6 text-center">
              <p className="text-sm text-yellow-200">
                ⚠️ Database connection issue detected.
              </p>
              <p className="mt-2 text-xs text-yellow-300/60">
                Please verify Supabase connection in Vercel environment variables.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-white/60">
              <p className="font-semibold text-white/80 mb-2">Checklist:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>DATABASE_URL configured in Vercel</li>
                <li>Supabase tables created</li>
                <li>Supabase IPv4 add-on enabled (if needed)</li>
              </ul>
            </div>
          </div>
        ) : (
          <LoginForm />
        )}
        <p className="text-center text-xs text-white/30">
          Need help? Contact the platform administrator.
        </p>
      </div>
    </div>
  );
}

