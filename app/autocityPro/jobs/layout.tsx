import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Manage jobs, work orders, and service tasks.",
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
