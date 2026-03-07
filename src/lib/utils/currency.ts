export function formatKYD(amount: number | null | undefined): string {
  if (amount == null) return "--";
  return `$${amount.toFixed(2)}`;
}
