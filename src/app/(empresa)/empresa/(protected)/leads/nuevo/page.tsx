import { LeadBuilder } from "./lead-builder";

export const metadata = { title: "Nuevo Lead — Pime Suite" };

export default function NuevoLeadPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <LeadBuilder />
    </div>
  );
}
