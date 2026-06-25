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
    borderTopWidth: 0.5,
    borderTopColor: COLORS.gold,
    paddingTop: SPACING.xs + 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { fontSize: 7, color: COLORS.textDim, flex: 1 },
  center: { fontSize: 7, color: COLORS.textDim, textAlign: "center", flex: 1 },
  right: { fontSize: 7.5, fontFamily: FONTS.mono, color: COLORS.goldDim, textAlign: "right" },
});

interface DocumentFooterProps {
  tr: PdfTranslations;
  config: Partial<CompanyConfig> | null;
  notes?: string | null;
}

export function DocumentFooter({ tr, config, notes }: DocumentFooterProps) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.left} render={({ pageNumber, totalPages }) =>
        `${tr.page} ${pageNumber} ${tr.of} ${totalPages}`
      } />
      <Text style={s.center}>
        {notes ?? config?.footerNotes_es ?? `${config?.name ?? "Pime Panamá"} · ${tr.thankyou}`}
      </Text>
      <Text style={s.right}>
        {config?.website ?? "pimepanama.com"}
      </Text>
    </View>
  );
}
