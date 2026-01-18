import type { Metadata } from "next";

// Admin-specific metadata with correct manifest
export const metadata: Metadata = {
  title: {
    default: "AutoCity ",
    template: "%s | AutoCity ",
  },
  description: "AutoCity  dashboard for managing sales, inventory, and reports.",
  
  // Reference admin-specific manifest
  manifest: "/manifest-admin.json",
  
  appleWebApp: {
    capable: true,
    title: "AutoCity ",
    statusBarStyle: "black-translucent",
  },
  
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  
  openGraph: {
    title: "AutoCity ",
    description: "AutoCity Operations.",
    url: "https://autocityqatar.com/autocityPro/login",
    siteName: "AutoCity ",
    type: "website",
    images: [
      {
        url: "https://autocityqatar.com/login.png",
        width: 1200,
        height: 630,
        alt: "AutoCity  Logo",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    title: "AutoCity ",
    description: "AutoCity  dashboard for sales, stock, and reporting.",
    images: ["https://autocityqatar.com/login.png"],
  },
  
  // Prevent admin pages from being indexed
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}