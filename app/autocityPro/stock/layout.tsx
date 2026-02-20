import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock",
  description: "View and manage stock levels and inventory.",
};

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
