import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers",
  description: "Manage customer records and contact information.",
};

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
