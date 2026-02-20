import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description: "Manage product catalog, pricing, and inventory details.",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
