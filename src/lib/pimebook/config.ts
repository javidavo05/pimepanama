export function bookingTimezone(): string {
  return process.env.BOOKING_DEFAULT_TIMEZONE?.trim() || "America/Panama";
}

export function bookingMinNoticeHours(): number {
  const n = Number(process.env.BOOKING_MIN_NOTICE_HOURS ?? 2);
  return Number.isFinite(n) && n >= 0 ? n : 2;
}

export function siteUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return base.replace(/\/$/, "");
}
