import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING, PAGE } from "../tokens";
import { GradientBar } from "./gradient";
import { Pill } from "./pill";
import type { CompanyConfig } from "@prisma/client";

const s = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    paddingVertical: SPACING.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: 42,
    height: 42,
    objectFit: "contain",
    marginRight: SPACING.sm,
  },
  companyCol: { flexDirection: "column" },
  companyName: {
    fontFamily: FONTS.heading,
    fontWeight: 800,
    fontSize: 12,
    color: COLORS.ink,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  detail: { fontFamily: FONTS.body, fontSize: 7.4, color: COLORS.slate, lineHeight: 1.5 },
  right: { alignItems: "flex-end" },
  docLabel: {
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 7.5,
    color: COLORS.blue,
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  docNumber: {
    fontFamily: FONTS.heading,
    fontWeight: 800,
    fontSize: 17,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  statusPill: { marginTop: 6 },
  divider: { height: 1, backgroundColor: COLORS.line, width: "100%" },
});

interface DocumentHeaderProps {
  config: Partial<CompanyConfig> | null;
  docLabel: string;
  docNumber: string | null;
  /** Pre-fetched base64 data URL (server) or a plain URL (client preview) — see logo-loader.ts. */
  logoSrc: string;
  /** Status badge (e.g. "PAGADA", "ACEPTADA") rendered under the doc number — keeps every document type consistent with contrato-pdf's status Pill. */
  statusLabel?: string;
  statusVariant?: "solid" | "outline" | "grad";
}

export function DocumentHeader({ config, docLabel, docNumber, logoSrc, statusLabel, statusVariant = "outline" }: DocumentHeaderProps) {
  const company = config?.name ?? "PIME PANAMA";
  const ruc = config?.ruc ?? "1-NT-2-739436 DV71";

  return (
    <View style={s.container} fixed>
      <GradientBar width={PAGE.width} height={4} />
      <View style={s.content}>
        <View style={s.left}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={s.logo} src={logoSrc} />
          <View style={s.companyCol}>
            <Text style={s.companyName}>{company.toUpperCase()}</Text>
            {ruc && <Text style={s.detail}>RUC: {ruc}</Text>}
            {config?.address && (
              <Text style={s.detail}>
                {config.address}
                {config.city ? `, ${config.city}` : ""}
                {config.country ? `, ${config.country}` : ""}
              </Text>
            )}
            {config?.phone && <Text style={s.detail}>Tel: {config.phone}</Text>}
            {config?.email && <Text style={s.detail}>{config.email}</Text>}
            {config?.website && <Text style={s.detail}>{config.website}</Text>}
          </View>
        </View>
        <View style={s.right}>
          <Text style={s.docLabel}>{docLabel}</Text>
          {docNumber && <Text style={s.docNumber}>{docNumber}</Text>}
          {statusLabel && (
            <View style={s.statusPill}>
              <Pill variant={statusVariant}>{statusLabel}</Pill>
            </View>
          )}
        </View>
      </View>
      <View style={s.divider} />
    </View>
  );
}
