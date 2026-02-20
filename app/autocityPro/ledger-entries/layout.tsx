import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ledger Entries",
  description: "View and manage ledger entries and transactions.",
};

export default function LedgerEntriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
