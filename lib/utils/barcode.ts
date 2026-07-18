export interface BarcodeBar {
  x: number;
  width: number;
}

export interface BarcodeRenderData {
  bars: BarcodeBar[];
  width: number;
  height: number;
  value: string;
}

const CODE128_PATTERNS = [
  "11011001100", "11001101100", "11001100110", "10010011000",
  "10010001100", "10001001100", "10011001000", "10011000100",
  "10001100100", "11001001000", "11001000100", "11000100100",
  "10110011100", "10011011100", "10011001110", "10111001100",
  "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110",
  "11101001100", "11100101100", "11100100110", "11101100100",
  "11100110100", "11100110010", "11011011000", "11011000110",
  "11000110110", "10100011000", "10001011000", "10001000110",
  "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110",
  "10001101110", "10111011000", "10111000110", "10001110110",
  "11101110110", "11010001110", "11000101110", "11011101000",
  "11011100010", "11011101110", "11101011000", "11101000110",
  "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000",
  "10100001100", "10010110000", "10010000110", "10000101100",
  "10000100110", "10110010000", "10110000100", "10011010000",
  "10011000010", "10000110100", "10000110010", "11000010010",
  "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100",
  "10011110100", "10011110010", "11110100100", "11110010100",
  "11110010010", "11011011110", "11011110110", "11110110110",
  "10101111000", "10100011110", "10001011110", "10111101000",
  "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100",
  "11010010000", "11010011100", "1100011101011",
];

export function sanitizeBarcodeValue(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase();
}

function getEan13CheckDigit(firstTwelveDigits: string): number {
  const sum = firstTwelveDigits
    .split("")
    .reduce((total, digit, index) => {
      const value = Number(digit);
      return total + value * (index % 2 === 0 ? 1 : 3);
    }, 0);

  return (10 - (sum % 10)) % 10;
}

export function generateInternalBarcodeCandidate(): string {
  const timestampPart = Date.now().toString().slice(-7).padStart(7, "0");
  const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  const firstTwelveDigits = `20${timestampPart}${randomPart}`;

  return `${firstTwelveDigits}${getEan13CheckDigit(firstTwelveDigits)}`;
}

function getCode128BValue(char: string): number {
  const code = char.charCodeAt(0);

  if (code < 32 || code > 126) {
    throw new Error(`Barcode contains unsupported character: ${char}`);
  }

  return code - 32;
}

export function getCode128BRenderData(
  rawValue: unknown,
  options: { height?: number; quietZone?: number } = {}
): BarcodeRenderData {
  const value = sanitizeBarcodeValue(rawValue);

  if (!value) {
    throw new Error("Barcode value is required");
  }

  const codes = [104, ...value.split("").map(getCode128BValue)];
  const checksum = codes.reduce((sum, code, index) => (
    index === 0 ? sum + code : sum + code * index
  ), 0) % 103;

  const bitPattern = [...codes, checksum, 106]
    .map((code) => CODE128_PATTERNS[code])
    .join("");

  const quietZone = options.quietZone ?? 10;
  const bars: BarcodeBar[] = [];
  let moduleIndex = quietZone;

  for (let i = 0; i < bitPattern.length; i += 1) {
    if (bitPattern[i] !== "1") {
      moduleIndex += 1;
      continue;
    }

    const start = moduleIndex;
    let width = 0;

    while (bitPattern[i] === "1") {
      width += 1;
      moduleIndex += 1;
      i += 1;
    }

    bars.push({ x: start, width });
    i -= 1;
  }

  return {
    bars,
    width: bitPattern.length + quietZone * 2,
    height: options.height ?? 72,
    value,
  };
}
