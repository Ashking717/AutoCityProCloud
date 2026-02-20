import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Track and manage business expenses.",
};

export default function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
