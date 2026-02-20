import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage product and service categories.",
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
