import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";
import Category from "@/lib/models/Category";
import Product from "@/lib/models/ProductEnhanced";
import BulkImportClient from "./BulkImportClient";

export const dynamic = "force-dynamic";

async function getNextSKU(outletId: string): Promise<string> {
  const last: any = await Product.findOne({ outletId })
    .sort({ sku: -1 })
    .select("sku")
    .lean();
  if (!last?.sku) return "10001";
  const num = parseInt(String(last.sku), 10);
  return isNaN(num) ? "10001" : String(num + 1);
}

export default async function BulkImportPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) redirect("/autocityPro/login");

  let user: any;
  try {
    user = verifyToken(token);
  } catch {
    redirect("/autocityPro/login");
  }

  await connectDB();

  const [categories, nextSKU] = await Promise.all([
    Category.find({ outletId: user.outletId, isActive: true })
      .sort({ name: 1 })
      .lean(),
    getNextSKU(user.outletId),
  ]);

  return (
    <BulkImportClient
      initialUser={user}
      categories={JSON.parse(JSON.stringify(categories))}
      nextSKU={nextSKU}
    />
  );
}