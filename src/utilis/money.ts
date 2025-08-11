// store integer smallest unit. Convert helpers.
export const toCents = (amountStr: string | number) => {
  // accepts "10.50" or 10.5 or "10" -> returns 1050
  const amountNum =
    typeof amountStr === "string" ? Number(amountStr) : amountStr;
  if (Number.isNaN(amountNum)) throw new Error("Invalid amount");
  return Math.round(amountNum * 100);
};

export const fromCents = (cents: number) => (cents / 100).toFixed(2);
