import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import OpenAI from "openai";
import { connectDB } from "@/lib/db/mongodb";
import SupplierItemMemory, { normaliseKey } from "@/lib/models/Supplieritemmemory";
import Product from "@/lib/models/ProductEnhanced";
import mongoose from "mongoose";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface OCRParsedItem {
  name: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  taxRate: number;
  total: number;
  confidence: "high" | "medium" | "low";
  /** Populated server-side when a memory match is found */
  memoryMatch?: {
    productId: string;
    productName: string;
    productSku: string;
    confirmCount: number;
  };
}

export interface OCRParsedResult {
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  items: OCRParsedItem[];
  subtotal?: number;
  taxTotal?: number;
  grandTotal?: number;
  currency?: string;
  notes?: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

// ─── Prompt ───────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert invoice and purchase order parser for an automotive parts inventory system.
Extract structured data from invoice/receipt images with maximum accuracy.

LANGUAGE RULE — ABSOLUTE:
- The "name" field MUST contain ONLY English text. Zero exceptions.
- Translate every product name to English, regardless of the invoice language.
- If the invoice shows BOTH English and Arabic (e.g. "Moulding طفوة"), use ONLY the English word: "Moulding".
- NEVER include Arabic, Chinese, or any non-Latin script in any "name" value.
- NEVER write "Word (أي نص عربي)" — the parenthetical Arabic is forbidden.
- Codes, part numbers, and barcodes are exempt — keep them exactly as printed.

DUPLICATE RULE:
- Each physical invoice line must appear EXACTLY ONCE in the items array.
- Do NOT repeat the same item twice even if it appears on two parts of the page.

OTHER RULES:
1. Return ONLY valid JSON — no markdown fences, no explanation.
2. Every numeric field must be a number (not a string).
3. Missing fields → null (not empty string, not 0).
4. Quantities must be positive.
5. "unitPrice" = per-unit price, NOT the line total.
6. Defaults when unspecified: unit="pcs", taxRate=0.
7. confidence: "high"=clear, "medium"=some guessing, "low"=very unclear.
8. "partNumber" = the ref code on that invoice line, NOT your inventory SKU.
9. Add warnings for ambiguous or missing critical fields.

JSON SCHEMA:
{
  "supplierName": string | null,
  "supplierPhone": string | null,
  "supplierEmail": string | null,
  "invoiceNumber": string | null,
  "invoiceDate": string | null,
  "items": [
    {
      "name": string,
      "partNumber": string | null,
      "quantity": number,
      "unitPrice": number,
      "unit": string,
      "taxRate": number,
      "total": number,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "subtotal": number | null,
  "taxTotal": number | null,
  "grandTotal": number | null,
  "currency": string | null,
  "notes": string | null,
  "confidence": "high" | "medium" | "low",
  "warnings": string[]
}`;

// ─── Normalise helpers ────────────────────────────────────────────────────────
function toEnglishName(raw: string): string {
  if (!raw) return raw;
  let n = raw.replace(/\([^)]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF][^)]*\)/g, "");
  n = n.replace(/[^\x00-\x7F]+/g, "");
  return n.trim().replace(/\s{2,}/g, " ");
}

function dedupItems(items: OCRParsedItem[]): OCRParsedItem[] {
  const seen = new Set<string>();
  const out: OCRParsedItem[] = [];
  for (const item of items) {
    const key = item.partNumber
      ? item.partNumber.toLowerCase().replace(/\s/g, "")
      : `name:${item.name.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

// ─── Parse a single image ─────────────────────────────────────────────────────
async function parseSingleImage(
  base64Data: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<OCRParsedResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mediaType};base64,${base64Data}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: "Parse this invoice. Return JSON only. IMPORTANT: every product name must be in English only — translate from Arabic or any other language. Never include Arabic script in the name field. Never repeat the same item twice.",
          },
        ],
      },
    ],
  });

  const rawText = response.choices[0]?.message?.content ?? "";
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as OCRParsedResult;
}

// ─── Sanitize a single result ─────────────────────────────────────────────────
function sanitize(parsed: OCRParsedResult): OCRParsedResult {
  let items = (parsed.items || []).map((item): OCRParsedItem => ({
    ...item,
    name: toEnglishName((item.name || "").trim()),
    partNumber: item.partNumber?.trim() || undefined,
    quantity: Math.max(0.001, Number(item.quantity) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    taxRate: Math.min(100, Math.max(0, Number(item.taxRate) || 0)),
    total: Math.max(0, Number(item.total) || 0),
    unit: item.unit || "pcs",
    confidence: item.confidence || "medium",
  }));
  items = dedupItems(items);

  if (parsed.subtotal != null) parsed.subtotal = Number(parsed.subtotal) || 0;
  if (parsed.taxTotal != null) parsed.taxTotal = Number(parsed.taxTotal) || 0;
  if (parsed.grandTotal != null) parsed.grandTotal = Number(parsed.grandTotal) || 0;
  parsed.warnings = parsed.warnings || [];

  return { ...parsed, items };
}

// ─── Merge multiple results ───────────────────────────────────────────────────
function mergeResults(results: OCRParsedResult[]): OCRParsedResult {
  if (results.length === 1) return results[0];

  const allItems: OCRParsedItem[] = [];
  for (const r of results) allItems.push(...r.items);
  const items = dedupItems(allItems);

  const pick = <T>(arr: (T | undefined | null)[]) => arr.find(Boolean) ?? undefined;
  const rank: Record<string, number> = { high: 2, medium: 1, low: 0 };
  const worstConf = results.reduce(
    (worst, r) => rank[r.confidence] < rank[worst] ? r.confidence : worst,
    "high" as "high" | "medium" | "low"
  );

  const warnings: string[] = [
    `Merged ${results.length} images — ${items.length} unique items found`,
  ];
  results.forEach((r, i) => r.warnings.forEach((w) => warnings.push(`Page ${i + 1}: ${w}`)));

  return {
    supplierName: pick(results.map(r => r.supplierName)),
    supplierPhone: pick(results.map(r => r.supplierPhone)),
    supplierEmail: pick(results.map(r => r.supplierEmail)),
    invoiceNumber: pick(results.map(r => r.invoiceNumber)),
    invoiceDate: pick(results.map(r => r.invoiceDate)),
    currency: pick(results.map(r => r.currency)),
    items,
    subtotal: results[results.length - 1].subtotal ?? undefined,
    taxTotal: results[results.length - 1].taxTotal ?? undefined,
    grandTotal: results[results.length - 1].grandTotal ?? undefined,
    confidence: worstConf,
    warnings,
  };
}

// ─── Pre-resolve items against supplier memory ────────────────────────────────
async function resolveItemsAgainstMemory(
  items: OCRParsedItem[],
  supplierId: mongoose.Types.ObjectId,
  outletId: mongoose.Types.ObjectId
): Promise<{ items: OCRParsedItem[]; memoryHits: number }> {
  console.log("Fetching supplier memory...", outletId.toString(), supplierId.toString());
  const memoryEntries = await SupplierItemMemory.find({ outletId, supplierId }).lean();
  if (!memoryEntries.length) return { items, memoryHits: 0 };

  const byName = new Map<string, any>();
  const byPN = new Map<string, any>();
  for (const entry of memoryEntries) {
    if (entry.supplierItemName) byName.set(entry.supplierItemName, entry);
    if (entry.supplierPartNumber) byPN.set(entry.supplierPartNumber, entry);
  }

  const allProductIds = new Set(memoryEntries.map(e => String(e.productId)));
  const activeProducts = await Product.find({
    _id: { $in: [...allProductIds].map(id => new mongoose.Types.ObjectId(id)) },
    outletId,
    isActive: true,
  }).select('_id').lean();
  const activeSet = new Set(activeProducts.map(p => String(p._id)));

  let memoryHits = 0;
  const resolved = items.map(item => {
    const normName = normaliseKey(item.name || '');
    const normPN = normaliseKey(item.partNumber || '');
    const match = (normPN && byPN.get(normPN)) || (normName && byName.get(normName));
    if (!match) return item;
    if (!activeSet.has(String(match.productId))) return item;

    memoryHits++;
    return {
      ...item,
      memoryMatch: {
        productId: String(match.productId),
        productName: match.productName,
        productSku: match.productSku,
        confirmCount: match.confirmCount,
      },
    };
  });

  return { items: resolved, memoryHits };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    console.log("parsing image.....");

    const token = cookies().get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = verifyToken(token);
    const outletId = new mongoose.Types.ObjectId(
      typeof user.outletId === "string" ? user.outletId : String(user.outletId)
    );

    const formData = await request.formData();
    const single = formData.get("image") as File | null;
    const multiFiles = formData.getAll("images[]") as File[];
    const supplierIdStr = formData.get("supplierId") as string | null;

    const files: File[] = multiFiles.length > 0 ? multiFiles : single ? [single] : [];
    if (files.length === 0)
      return NextResponse.json({ error: "No image(s) provided" }, { status: 400 });
    if (files.length > 10)
      return NextResponse.json({ error: "Maximum 10 images allowed" }, { status: 400 });

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024)
        return NextResponse.json({ error: `"${file.name}" exceeds 10 MB` }, { status: 400 });
      if (!allowedTypes.includes(file.type))
        return NextResponse.json({ error: `"${file.name}" is unsupported type` }, { status: 400 });
    }

    // ── Parse all images in parallel ──────────────────────────────────────────
    let rawResults: OCRParsedResult[];
    try {
      console.log("images parsed......");
      rawResults = await Promise.all(
        files.map(async (file) => {
          const buf = await file.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const mt = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
          return parseSingleImage(b64, mt);
        })
      );
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response. Try a clearer image." },
        { status: 422 }
      );
    }

    const sanitized = rawResults.map(sanitize);
    const merged = mergeResults(sanitized);

    if (merged.items.length === 0)
      merged.warnings.push("No line items detected. Please review manually.");

    // ── Memory pre-resolution ─────────────────────────────────────────────────
    let memoryHits = 0;
    if (supplierIdStr && mongoose.Types.ObjectId.isValid(supplierIdStr)) {
      const supplierId = new mongoose.Types.ObjectId(supplierIdStr);
      const resolved = await resolveItemsAgainstMemory(merged.items, supplierId, outletId);
      merged.items = resolved.items;
      memoryHits = resolved.memoryHits;
      if (memoryHits > 0) {
        merged.warnings.unshift(
          `🧠 ${memoryHits} item${memoryHits > 1 ? "s" : ""} auto-matched from supplier memory`
        );
      }
    }

    return NextResponse.json({
      success: true,
      result: merged,
      imageCount: files.length,
      memoryHits,
    });
  } catch (error: any) {
    console.error("OCR API error:", error);
    return NextResponse.json(
      { error: error.message || "OCR processing failed" },
      { status: 500 }
    );
  }
}


// app/api/purchases/ocr/route.ts

// import { NextRequest, NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import OpenAI from "openai";
// import jwt from "jsonwebtoken";

// // ─────────────────────────────────────────────────────────────
// // OpenAI Client
// // ─────────────────────────────────────────────────────────────

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY!,
// });

// // ─────────────────────────────────────────────────────────────
// // Types
// // ─────────────────────────────────────────────────────────────

// export interface OCRParsedItem {
//   name: string;
//   partNumber?: string;
//   quantity: number;
//   unitPrice: number;
//   unit: string;
//   taxRate: number;
//   total: number;
//   confidence: "high" | "medium" | "low";
// }

// export interface OCRParsedResult {
//   supplierName?: string | null;
//   supplierPhone?: string | null;
//   supplierEmail?: string | null;
//   invoiceNumber?: string | null;
//   invoiceDate?: string | null;
//   items: OCRParsedItem[];
//   subtotal?: number | null;
//   taxTotal?: number | null;
//   grandTotal?: number | null;
//   currency?: string | null;
//   notes?: string | null;
//   confidence: "high" | "medium" | "low";
//   warnings: string[];
// }

// // ─────────────────────────────────────────────────────────────
// // Auth
// // ─────────────────────────────────────────────────────────────

// function verifyToken(token: string) {
//   jwt.verify(token, process.env.JWT_SECRET!);
// }

// // ─────────────────────────────────────────────────────────────
// // Prompt
// // ─────────────────────────────────────────────────────────────

// const SYSTEM_PROMPT = `
// You are an expert invoice and purchase order parser.

// LANGUAGE RULE:
// - "name" must be ENGLISH ONLY.
// - Translate from any language to English.
// - Never include Arabic or non-Latin characters.

// RULES:
// 1. JSON only
// 2. Numbers must be numbers
// 3. Missing → null
// 4. unitPrice = per-unit
// 5. unit default = "pcs"
// 6. taxRate default = 0
// 7. Each invoice line appears once

// Return schema:

// {
//  "supplierName": string | null,
//  "invoiceNumber": string | null,
//  "items": [{
//    "name": string,
//    "partNumber": string | null,
//    "quantity": number,
//    "unitPrice": number,
//    "unit": string,
//    "taxRate": number,
//    "total": number,
//    "confidence": "high"|"medium"|"low"
//  }],
//  "subtotal": number | null,
//  "taxTotal": number | null,
//  "grandTotal": number | null,
//  "currency": string | null,
//  "notes": string | null,
//  "confidence": "high"|"medium"|"low",
//  "warnings": string[]
// }
// `;

// // ─────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────

// function toEnglishName(raw: string) {
//   return raw
//     ?.replace(/[^\x00-\x7F]+/g, "")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function dedupItems(items: OCRParsedItem[]) {
//   const seen = new Set<string>();
//   return items.filter(i => {
//     const key = i.partNumber || i.name.toLowerCase();
//     if (seen.has(key)) return false;
//     seen.add(key);
//     return true;
//   });
// }

// // ─────────────────────────────────────────────────────────────
// // OCR (Single Image)
// // ─────────────────────────────────────────────────────────────

// async function parseSingleImage(base64: string, type: string) {
//   const res = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     temperature: 0,
//     max_tokens: 4096,
//     response_format: { type: "json_object" },
//     messages: [
//       { role: "system", content: SYSTEM_PROMPT },
//       {
//         role: "user",
//         content: [
//           {
//             type: "image_url",
//             image_url: { url: `data:${type};base64,${base64}` }
//           },
//           {
//             type: "text",
//             text: "Parse this invoice. Return JSON only."
//           }
//         ]
//       }
//     ]
//   });

//   return res.choices[0].message.content as unknown as OCRParsedResult;
// }

// // ─────────────────────────────────────────────────────────────
// // API Route
// // ─────────────────────────────────────────────────────────────

// export async function POST(req: NextRequest) {
//   try {
//     const token = cookies().get("auth-token")?.value;
//     if (!token) throw new Error("Unauthorized");
//     verifyToken(token);

//     const form = await req.formData();
//     const files = form.getAll("images[]") as File[];

//     if (!files.length) {
//       return NextResponse.json({ error: "No images uploaded" }, { status: 400 });
//     }

//     const results = await Promise.all(
//       files.map(async file => {
//         const buf = Buffer.from(await file.arrayBuffer());
//         return parseSingleImage(buf.toString("base64"), file.type);
//       })
//     );

//     let items = results.flatMap(r => r.items || []);
//     items = dedupItems(items).map(i => ({
//       ...i,
//       name: toEnglishName(i.name),
//       unit: i.unit || "pcs",
//       taxRate: i.taxRate ?? 0,
//       confidence: i.confidence || "medium"
//     }));

//     const finalResult: OCRParsedResult = {
//       supplierName: results[0]?.supplierName ?? null,
//       invoiceNumber: results[0]?.invoiceNumber ?? null,
//       items,
//       subtotal: results.at(-1)?.subtotal ?? null,
//       taxTotal: results.at(-1)?.taxTotal ?? null,
//       grandTotal: results.at(-1)?.grandTotal ?? null,
//       currency: results[0]?.currency ?? null,
//       notes: null,
//       confidence: "medium",
//       warnings: []
//     };

//     return NextResponse.json({
//       success: true,
//       result: finalResult,
//       imageCount: files.length
//     });

//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json(
//       { error: err.message || "OCR failed" },
//       { status: 500 }
//     );
//   }
// }