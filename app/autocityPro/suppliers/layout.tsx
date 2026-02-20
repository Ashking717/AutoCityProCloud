import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suppliers",
  description: "Manage supplier records and vendor information.",
};

export default function SuppliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
