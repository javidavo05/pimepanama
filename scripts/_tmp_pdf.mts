import { writeFileSync } from "fs";
import { prisma } from "@/lib/prisma";
import { asegurarPropuesta, pdfDePropuesta } from "@/lib/leads/respuestas";
const u = await prisma.empresaUser.findFirst({ where: { id: "cmqtx506t0000ukoughxgvg91" } });
for (const empresa of process.argv.slice(2)) {
  const t0 = Date.now(); const r = await prisma.respuestaLead.findFirst({ where: { lead: { company: empresa } } });
  await asegurarPropuesta({ userId: u!.id, supabaseUid: u!.supabaseUid, id: r!.id, soloPdf: true });
  const { pdf, nombre } = await pdfDePropuesta({ userId: u!.id, supabaseUid: u!.supabaseUid, id: r!.id });
  writeFileSync("/private/tmp/claude-501/-Users-javiervallejo-Documents-Websites-pimepanama/24977e83-cc2b-4747-88a4-c99e9f7ed52e/scratchpad/v3-" + nombre, pdf);
  console.log(nombre, Date.now() - t0, "ms");
}
await prisma.$disconnect();
