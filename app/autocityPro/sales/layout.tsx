import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales",
  description: "Manage sales transactions and invoices.",
};

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
