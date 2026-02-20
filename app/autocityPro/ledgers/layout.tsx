import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ledgers",
  description: "View and manage financial ledgers.",
};

export default function LedgersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
