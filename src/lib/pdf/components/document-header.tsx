import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";
import type { CompanyConfig } from "@prisma/client";

const s = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  blueStripe: { height: 4, backgroundColor: COLORS.blue, width: "100%" },
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
    width: 88,
    height: 48,
    objectFit: "contain",
    marginRight: SPACING.md,
  },
  companyCol: { flexDirection: "column" },
  companyName: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detail: { fontSize: 7.5, color: COLORS.textMuted, lineHeight: 1.5 },
  right: { alignItems: "flex-end" },
  docLabel: {
    fontFamily: FONTS.bold,
    fontSize: 7,
    color: COLORS.blue,
    letterSpacing: 2.5,
    marginBottom: 3,
  },
  docNumber: {
    fontFamily: FONTS.monoBold,
    fontSize: 18,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  divider: { height: 1, backgroundColor: COLORS.border, width: "100%" },
});

interface DocumentHeaderProps {
  config: Partial<CompanyConfig> | null;
  docLabel: string;
  docNumber: string | null;
  /** Pre-fetched base64 data URL — avoids network fetch inside react-pdf. */
  logoSrc: string;
}

export function DocumentHeader({ config, docLabel, docNumber, logoSrc }: DocumentHeaderProps) {
  const company = config?.name ?? "PIME PANAMA";
  const ruc = config?.ruc ?? "1-NT-2-739436 DV71";

  return (
    <View style={s.container} fixed>
      <View style={s.blueStripe} />
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
        </View>
      </View>
      <View style={s.divider} />
    </View>
  );
}
