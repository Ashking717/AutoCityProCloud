// app/autocityPro/products/page.tsx
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";

async function getServerData() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    redirect("/autocityPro/login");
  }

  // ✅ VERCEL-SAFE BASE URL
  const headersList = headers();
  const host = headersList.get("host");
  const protocol =
    process.env.NODE_ENV === "development" ? "http" : "https";

  const baseUrl = `${protocol}://${host}`;

  // ✅ Forward cookie explicitly
  const cookieHeader = `auth-token=${token}`;

  const [userRes, productsRes, categoriesRes, skuRes] = await Promise.all([
    fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/products?page=1&limit=50`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/categories`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/products/next-sku`, {
      headers: { cookie: cookieHeader },
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
    initialProducts: productsData.products ?? [],
    initialStats: productsData.stats ?? {},
    initialPagination: productsData.pagination ?? {},
    categories: categoriesData.categories ?? [],
    nextSKU: skuData.nextSKU ?? "10001",
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
