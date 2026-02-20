import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Movements",
  description: "Track inventory movements and stock transfers.",
};

export default function InventoryMovementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
