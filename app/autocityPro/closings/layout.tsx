import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Closings",
  description: "Manage daily closings and cash settlements.",
};

export default function ClosingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
