import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vouchers",
  description: "Manage vouchers, receipts, payments, contra entries, and journal entries.",
};

export default function VouchersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
