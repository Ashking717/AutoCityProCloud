import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your AutoCity Pro account password.",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
