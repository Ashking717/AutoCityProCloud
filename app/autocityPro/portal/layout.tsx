import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal",
  description: "Customer and supplier portal access.",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
