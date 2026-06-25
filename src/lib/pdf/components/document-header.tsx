import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";
import type { CompanyConfig } from "@prisma/client";

const s = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  goldRule: { height: 2, backgroundColor: COLORS.gold, marginBottom: SPACING.lg },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  company: { flex: 1 },
  companyName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, letterSpacing: 1 },
  legalName: { fontSize: 8, color: COLORS.textMuted, marginTop: 2 },
  detail: { fontSize: 7.5, color: COLORS.textDim, marginTop: 1.5 },
  badge: {
    backgroundColor: COLORS.bgHeader,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "flex-end",
  },
  badgeLabel: { fontFamily: FONTS.mono, fontSize: 7, color: COLORS.goldDim, letterSpacing: 1.5 },
  badgeValue: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.gold, letterSpacing: -0.5 },
});

interface DocumentHeaderProps {
  config: Partial<CompanyConfig> | null;
  docLabel: string;
  docNumber: string | null;
}

export function DocumentHeader({ config, docLabel, docNumber }: DocumentHeaderProps) {
  const company = config?.name ?? "Pime Panamá";

  return (
    <View style={s.container} fixed>
      {/* Gold top rule */}
      <View style={s.goldRule} />
      <View style={s.row}>
        <View style={s.company}>
          <Text style={s.companyName}>{company.toUpperCase()}</Text>
          {config?.legalName && <Text style={s.legalName}>{config.legalName}</Text>}
          {config?.ruc && <Text style={s.detail}>RUC: {config.ruc}</Text>}
          {config?.address && <Text style={s.detail}>{config.address}{config.city ? `, ${config.city}` : ""}{config.country ? `, ${config.country}` : ""}</Text>}
          {config?.phone && <Text style={s.detail}>Tel: {config.phone}</Text>}
          {config?.email && <Text style={s.detail}>{config.email}</Text>}
          {config?.website && <Text style={s.detail}>{config.website}</Text>}
        </View>
        <View style={s.badge}>
          <Text style={s.badgeLabel}>{docLabel}</Text>
          {docNumber && <Text style={s.badgeValue}>{docNumber}</Text>}
        </View>
      </View>
    </View>
  );
}
