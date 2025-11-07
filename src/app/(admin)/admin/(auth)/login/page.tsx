import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-900 to-black px-6 py-24 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">PIME Admin Console</p>
          <h1 className="text-2xl font-semibold uppercase tracking-[0.3em]">Access</h1>
          <p className="text-sm text-white/50">Secure area for managing web content and case studies.</p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-white/30">
          Need help? Contact the platform administrator to reset credentials.
        </p>
      </div>
    </div>
  );
}

