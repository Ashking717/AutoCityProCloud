import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
  description: "View and manage messages and notifications.",
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
