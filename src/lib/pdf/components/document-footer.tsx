import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";
import type { PdfTranslations } from "../translations";
import type { CompanyConfig } from "@prisma/client";

const s = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: SPACING.page,
    left: SPACING.page,
    right: SPACING.page,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { fontFamily: FONTS.body, fontSize: 7, color: COLORS.slateLight, fontWeight: 500 },
  right: {
    fontFamily: FONTS.heading,
    fontWeight: 700,
    fontSize: 7.5,
    color: COLORS.slateLight,
  },
});

interface DocumentFooterProps {
  tr: PdfTranslations;
  config: Partial<CompanyConfig> | null;
  notes?: string | null;
}

export function DocumentFooter({ tr, config, notes }: DocumentFooterProps) {
  const label = notes ?? config?.footerNotes_es ?? `${config?.name ?? "Pime Panamá"} · ${tr.thankyou}`;
  return (
    <View style={s.footer} fixed>
      <Text style={s.left}>{label}</Text>
      <Text
        style={s.right}
        render={({ pageNumber, totalPages }) =>
          `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`
        }
      />
    </View>
  );
}
