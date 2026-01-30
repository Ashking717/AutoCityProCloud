// app/autocityPro/products/page.tsx
// ✅ CORRECTED FETCH VERSION (no NEXT_PUBLIC_API_URL needed)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";

// ✅ Server-side data fetching with internal fetch
async function getServerData() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    redirect("/autocityPro/login");
  }

  // ✅ CORRECT: Use absolute URL with request context
  // No environment variable needed!
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
    // ? `${process.env.NEXT_PUBLIC_APP_URL}` 
    // : 

  // ✅ Parallel data fetching
  const [userRes, productsRes, categoriesRes, skuRes] = await Promise.all([
    fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `auth-token=${token}` },
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/products?page=1&limit=50`, {
      headers: { Cookie: `auth-token=${token}` },
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/categories`, {
      headers: { Cookie: `auth-token=${token}` },
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/products/next-sku`, {
      headers: { Cookie: `auth-token=${token}` },
      cache: "no-store",
    }),
  ]);

  if (!userRes.ok) {
    redirect("/autocityPro/login");
  }

  const [userData, productsData, categoriesData, skuData] = await Promise.all([
    userRes.json(),
    productsRes.json(),
    categoriesRes.json(),
    skuRes.json(),
  ]);

  return {
    user: userData.user,
    initialProducts: productsData.products || [],
    initialStats: productsData.stats || {},
    initialPagination: productsData.pagination || {},
    categories: categoriesData.categories || [],
    nextSKU: skuData.nextSKU || "10001",
  };
}

export default async function ProductsPage() {
  const serverData = await getServerData();

  return (
    <ProductsClient
      initialUser={serverData.user}
      initialProducts={serverData.initialProducts}
      initialStats={serverData.initialStats}
      initialPagination={serverData.initialPagination}
      categories={serverData.categories}
      nextSKU={serverData.nextSKU}
    />
  );
}