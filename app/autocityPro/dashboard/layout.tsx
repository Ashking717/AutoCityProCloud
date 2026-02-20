import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Business overview, metrics, and key performance indicators.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
