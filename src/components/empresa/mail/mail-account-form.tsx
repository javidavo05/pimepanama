"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignaturePreview } from "@/components/empresa/mail/signature-preview";
import { buildSignatureHtml } from "@/lib/mail/signature";
import type { CompanyPreview } from "@/components/empresa/mail/email-compose-modal";

interface FormState {
  label: string;
  host: string;
  port: string;
  tls: boolean;
  username: string;
  password: string;
  credType: string;
  smtpHost: string;
  smtpPort: string;
  smtpTls: boolean;
  fromName: string;
  signatureName: string;
  signatureTitle: string;
  signatureEnabled: boolean;
}

interface MailAccountFormProps {
  mode: "create" | "edit";
  accountId?: string;
  initial?: Partial<FormState>;
  company?: CompanyPreview | null;
}

const inputCls = "w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all";

export function MailAccountForm({ mode, accountId, initial, company }: MailAccountFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    label: initial?.label ?? "",
    host: initial?.host ?? "",
    port: initial?.port ?? "993",
    tls: initial?.tls ?? true,
    username: initial?.username ?? "",
    password: "",
    credType: initial?.credType ?? "PASSWORD_APP",
    smtpHost: initial?.smtpHost ?? "",
    smtpPort: initial?.smtpPort ?? "587",
    smtpTls: initial?.smtpTls ?? true,
    fromName: initial?.fromName ?? "Javier Vallejo",
    signatureName: initial?.signatureName ?? "Javier Vallejo",
    signatureTitle: initial?.signatureTitle ?? "",
    signatureEnabled: initial?.signatureEnabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; folders?: string[]; error?: string } | null>(null);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoOrigin, setLogoOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setLogoOrigin(window.location.origin);
  }, []);

  const signaturePreview = useMemo(() => {
    if (!form.username) return "";
    return buildSignatureHtml(
      {
        label: form.label,
        username: form.username,
        fromName: form.fromName,
        signatureName: form.signatureName,
        signatureTitle: form.signatureTitle || null,
        signatureEnabled: form.signatureEnabled,
        signatureHtml: null,
      },
      company ?? null,
      { logoOrigin: logoOrigin || undefined }
    );
  }, [form, company, logoOrigin]);

  function set(k: keyof FormState, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      let res: Response;
      if (mode === "edit" && accountId && !form.password) {
        res = await fetch(`/api/empresa/mail/accounts/${accountId}/test`, { method: "POST" });
      } else {
        if (!form.host || !form.username || !form.password) {
          setTestResult({ ok: false, error: "Completa servidor, usuario y contraseña antes de probar" });
          return;
        }
        res = await fetch("/api/empresa/mail/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host: form.host, port: form.port, tls: form.tls, username: form.username, password: form.password }),
        });
      }
      setTestResult(await res.json());
    } finally {
      setTesting(false);
    }
  }

  async function handleTestSmtp() {
    if (mode !== "edit" || !accountId) return;
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch(`/api/empresa/mail/accounts/${accountId}/test-smtp`, { method: "POST" });
      const data = await res.json();
      setSmtpTestResult(res.ok ? "Correo de prueba enviado vía Resend" : (data.error ?? "Error Resend"));
    } catch {
      setSmtpTestResult("Error de red");
    } finally {
      setTestingSmtp(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = mode === "create" ? "/api/empresa/mail/accounts" : `/api/empresa/mail/accounts/${accountId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body: Record<string, unknown> = {
        label: form.label,
        host: form.host,
        port: parseInt(form.port),
        tls: form.tls,
        username: form.username,
        credType: form.credType,
        smtpHost: form.smtpHost || undefined,
        smtpPort: parseInt(form.smtpPort),
        smtpTls: form.smtpTls,
        fromName: form.fromName || undefined,
        signatureName: form.signatureName || undefined,
        signatureTitle: form.signatureTitle || undefined,
        signatureEnabled: form.signatureEnabled,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al guardar");
        return;
      }
      router.push("/empresa/correos/cuentas");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Cuenta */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Identificación</h3>
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Nombre descriptivo</label>
          <input value={form.label} onChange={(e) => set("label", e.target.value)} required placeholder="Ej: Soporte, Ventas, Admin" className={inputCls} />
        </div>
      </div>

      {/* IMAP */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Servidor de entrada (IMAP)</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Servidor</label>
            <input value={form.host} onChange={(e) => set("host", e.target.value)} required placeholder="imap.gmail.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Puerto</label>
            <input value={form.port} onChange={(e) => set("port", e.target.value)} type="number" className={inputCls} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("tls", !form.tls)}
            className={`relative w-10 h-5 rounded-full overflow-hidden transition-colors ${form.tls ? "bg-[#1AA7F0]" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.tls ? "translate-x-5" : "translate-x-0"}`} />
          </button>
          <span className="text-white/50 text-sm">SSL/TLS activo</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Correo / Usuario</label>
            <input value={form.username} onChange={(e) => set("username", e.target.value)} required type="email" placeholder="usuario@empresa.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Contraseña</label>
            <input value={form.password} onChange={(e) => set("password", e.target.value)} type="password" placeholder={mode === "edit" ? "•••• (dejar en blanco para no cambiar)" : "Contraseña de aplicación"} className={inputCls} required={mode === "create"} />
          </div>
        </div>

        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Tipo de credencial</label>
          <div className="flex gap-2">
            {[["PASSWORD", "Contraseña normal"], ["PASSWORD_APP", "Contraseña de aplicación (recomendada)"]].map(([val, lab]) => (
              <button key={val} type="button" onClick={() => set("credType", val)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${form.credType === val ? "bg-[#1AA7F0]/10 border-[#1AA7F0]/30 text-[#1AA7F0]" : "border-white/[0.07] text-white/60 hover:text-white/60"}`}>
                {lab}
              </button>
            ))}
          </div>
          {form.credType === "PASSWORD_APP" && (
            <p className="text-white/50 text-xs mt-2">Para Gmail: Configuración → Seguridad → Contraseñas de aplicación</p>
          )}
        </div>

        {/* Test de conexión IMAP inline */}
        <div className="pt-1 border-t border-white/[0.05]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] disabled:opacity-40 text-white/70 text-sm rounded-lg transition-all"
            >
              {testing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                  Probando conexión…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  Probar conexión IMAP
                </>
              )}
            </button>
            {testResult && (
              <span className={`text-xs flex items-center gap-1.5 ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
                {testResult.ok ? (
                  <>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Conectado · {testResult.folders?.length ?? 0} carpetas
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {testResult.error}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Envío vía Resend (global) */}
      <div className="bg-[#0a0a10] border border-[#1AA7F0]/15 rounded-xl p-5 space-y-3">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Envío saliente (Resend)</h3>
        <p className="text-white/50 text-sm leading-relaxed">
          Los correos se envían vía <strong className="text-white/70">Resend</strong> con tracking de entrega y apertura.
          El correo/usuario de esta cuenta se usa como remitente si el dominio está verificado en Resend; si no, se usa <code className="text-white/60">RESEND_FROM</code>.
        </p>
        <p className="text-white/45 text-xs">
          Configura <code className="text-white/55">RESEND_API_KEY</code>, <code className="text-white/55">RESEND_FROM</code> y el webhook en Vercel. El username debe ser del dominio verificado (ej. javier@pimepanama.com).
        </p>
        {mode === "edit" && accountId && (
          <button
            type="button"
            onClick={handleTestSmtp}
            disabled={testingSmtp}
            className="px-4 py-2 text-xs border border-[#1AA7F0]/25 text-[#1AA7F0] rounded-lg hover:bg-[#1AA7F0]/10 disabled:opacity-50"
          >
            {testingSmtp ? "Enviando prueba..." : "Probar envío Resend"}
          </button>
        )}
        {smtpTestResult && (
          <p className={`text-xs ${smtpTestResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {smtpTestResult}
          </p>
        )}
      </div>

      {/* SMTP legacy (opcional) */}
      <details className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <summary className="text-white/50 text-xs uppercase tracking-widest font-medium cursor-pointer">
          SMTP legacy (opcional, ya no usado para enviar)
        </summary>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Servidor SMTP</label>
            <input value={form.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} placeholder="smtp.gmail.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Puerto</label>
            <input value={form.smtpPort} onChange={(e) => set("smtpPort", e.target.value)} type="number" className={inputCls} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("smtpTls", !form.smtpTls)}
            className={`relative w-10 h-5 rounded-full overflow-hidden transition-colors ${form.smtpTls ? "bg-[#1AA7F0]" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.smtpTls ? "translate-x-5" : "translate-x-0"}`} />
          </button>
          <span className="text-white/50 text-sm">STARTTLS / TLS activo</span>
        </div>
        {mode === "edit" && accountId && form.smtpHost && (
          <button
            type="button"
            onClick={handleTestSmtp}
            disabled={testingSmtp}
            className="px-4 py-2 text-xs border border-white/[0.08] text-white/60 rounded-lg hover:bg-white/[0.04] disabled:opacity-50"
          >
            {testingSmtp ? "Enviando..." : "Probar SMTP legacy"}
          </button>
        )}
        {smtpTestResult && form.smtpHost && (
          <p className={`text-xs ${smtpTestResult.includes("enviado") || smtpTestResult.includes("ok") ? "text-green-400" : "text-red-400"}`}>
            {smtpTestResult}
          </p>
        )}
      </details>

      {form.username && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Firma de correo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Nombre en firma</label>
              <input value={form.signatureName} onChange={(e) => set("signatureName", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Cargo / título</label>
              <input value={form.signatureTitle} onChange={(e) => set("signatureTitle", e.target.value)} placeholder="Director General" className={inputCls} />
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Nombre remitente (From)</label>
              <input value={form.fromName} onChange={(e) => set("fromName", e.target.value)} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input
              type="checkbox"
              checked={form.signatureEnabled}
              onChange={(e) => set("signatureEnabled", e.target.checked)}
            />
            Incluir firma en correos enviados
          </label>
          {signaturePreview && <SignaturePreview html={signaturePreview} />}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all ml-auto">
          {saving ? "Guardando..." : mode === "create" ? "Agregar cuenta" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
