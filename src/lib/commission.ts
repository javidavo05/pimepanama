export interface CommissionResult {
  commissionBase: number;
  commissionTaxAmt: number;
  totalCommission: number;
  netAmount: number;
}

export function calcCommission(
  grossAmount: number,
  pct: number,
  flat: number,
  taxOnCommission: number
): CommissionResult {
  const commissionBase = grossAmount * (pct / 100) + flat;
  const commissionTaxAmt = commissionBase * (taxOnCommission / 100);
  const totalCommission = commissionBase + commissionTaxAmt;
  const netAmount = grossAmount - totalCommission;
  return { commissionBase, commissionTaxAmt, totalCommission, netAmount };
}

export function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
