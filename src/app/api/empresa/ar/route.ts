import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { getReceivables } from "@/lib/receivables";

export async function GET(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const { items, total, overdue, due7d, due30d } = await getReceivables(user.id);

  return NextResponse.json({
    totalPending: total,
    overdueAmount: overdue,
    due7dAmount: due7d,
    due30dAmount: due30d,
    items: items.map((i) => ({
      ...i,
      dueDate: i.dueDate?.toISOString() ?? null,
    })),
  });
}
