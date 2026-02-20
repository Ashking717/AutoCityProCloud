import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Manage accounts, view balances, and set opening balances.",
};

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
