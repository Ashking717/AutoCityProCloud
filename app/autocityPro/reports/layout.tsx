import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports",
  description: "View business reports including sales, purchases, profit & loss, balance sheet, and more.",
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
