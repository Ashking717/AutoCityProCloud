export const PRODUCT_UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces", singular: "piece", plural: "pieces", shortLabel: "pcs" },
  { value: "set", label: "Set", singular: "set", plural: "sets", shortLabel: "set" },
  { value: "kg", label: "Kilogram", singular: "kilogram", plural: "kilograms", shortLabel: "kg" },
  { value: "liter", label: "Liter", singular: "liter", plural: "liters", shortLabel: "L" },
  { value: "meter", label: "Meter", singular: "meter", plural: "meters", shortLabel: "m" },
  { value: "box", label: "Box", singular: "box", plural: "boxes", shortLabel: "box" },
  { value: "pair", label: "Pair", singular: "pair", plural: "pairs", shortLabel: "pair" },
  { value: "roll", label: "Roll", singular: "roll", plural: "rolls", shortLabel: "roll" },
] as const;

const UNIT_ALIASES: Record<string, string> = {
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  sets: "set",
  kilogram: "kg",
  kilograms: "kg",
  litre: "liter",
  litres: "liter",
  liters: "liter",
  ltr: "liter",
  l: "liter",
  metres: "meter",
  meters: "meter",
  m: "meter",
  boxes: "box",
  pairs: "pair",
  rolls: "roll",
};

export function normalizeProductUnit(unit?: string | null) {
  const normalized = String(unit || "").trim().toLowerCase();
  if (!normalized) return "pcs";
  return UNIT_ALIASES[normalized] || normalized;
}

export function getProductUnitLabel(unit?: string | null) {
  const normalized = normalizeProductUnit(unit);
  const option = PRODUCT_UNIT_OPTIONS.find((item) => item.value === normalized);
  if (option) return option.label;

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatProductQuantity(
  quantity: number | string | null | undefined,
  unit?: string | null
) {
  const numericQuantity = Number(quantity);
  const safeQuantity = Number.isFinite(numericQuantity) ? numericQuantity : 0;
  const quantityText = Number.isInteger(safeQuantity)
    ? String(safeQuantity)
    : safeQuantity.toFixed(2).replace(/\.?0+$/, "");
  const normalized = normalizeProductUnit(unit);
  const option = PRODUCT_UNIT_OPTIONS.find((item) => item.value === normalized);

  if (!option) return `${quantityText} ${normalized}`;

  const label = Math.abs(safeQuantity) === 1 ? option.singular : option.plural;
  return `${quantityText} ${label}`;
}
