import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Logs",
  description: "View system activity logs and audit trail.",
};

export default function ActivityLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
