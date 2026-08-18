export type MailDeliveryStatusFields = {
  folder: string;
  deliveryStatus?: string | null;
  resendId?: string | null;
  bounceReason?: string | null;
};

export function mailDeliveryLabel(email: MailDeliveryStatusFields): string {
  if (email.folder !== "SENT") return "";

  const status = email.deliveryStatus;
  if (status === "OPENED") return "Abierto";
  if (status === "DELIVERED") return "Entregado";
  if (status === "SENT" || status === "ACCEPTED") return "Enviado";
  if (status === "BOUNCED") return "Rebote";
  if (status === "REJECTED") return "Rechazado";
  if (status === "COMPLAINED") return "Spam";
  if (email.resendId) return "Enviado";
  return "Sin tracking";
}

export function MailDeliveryStatusBadge({
  email,
  size = "sm",
}: {
  email: MailDeliveryStatusFields;
  size?: "sm" | "md";
}) {
  if (email.folder !== "SENT") return null;

  const status = email.deliveryStatus;
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  if (status === "OPENED") {
    return (
      <span className={`${pad} rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25`}>
        Abierto
      </span>
    );
  }
  if (status === "DELIVERED") {
    return (
      <span className={`${pad} rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25`}>
        Entregado
      </span>
    );
  }
  if (status === "SENT" || status === "ACCEPTED" || email.resendId) {
    return (
      <span className={`${pad} rounded-full bg-[#1AA7F0]/15 text-[#1AA7F0] border border-[#1AA7F0]/25`}>
        Enviado
      </span>
    );
  }
  if (status === "BOUNCED") {
    return (
      <span className={`${pad} rounded-full bg-red-500/15 text-red-300 border border-red-500/25`} title={email.bounceReason ?? undefined}>
        Rebote{email.bounceReason ? `: ${email.bounceReason.slice(0, 40)}` : ""}
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className={`${pad} rounded-full bg-red-500/15 text-red-300 border border-red-500/25`}>
        Rechazado
      </span>
    );
  }
  if (status === "COMPLAINED") {
    return (
      <span className={`${pad} rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/25`}>
        Marcado como spam
      </span>
    );
  }
  return (
    <span className={`${pad} rounded-full bg-amber-500/10 text-amber-200/80 border border-amber-500/20`}>
      Sin tracking Resend
    </span>
  );
}
