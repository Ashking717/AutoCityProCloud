import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchases",
  description: "Manage purchase orders and procurement records.",
};

export default function PurchasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
