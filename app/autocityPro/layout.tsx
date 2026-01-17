import type { Metadata } from "next";

// Admin-specific metadata with correct manifest
export const metadata: Metadata = {
  title: {
    default: "AutoCity Pro",
    template: "%s | AutoCity Pro",
  },
  description: "AutoCity Pro dashboard for managing sales, inventory, and reports.",
  
  // Reference admin-specific manifest
  manifest: "/manifest-admin.json",
  
  appleWebApp: {
    capable: true,
    title: "AutoCity Pro",
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
    title: "AutoCity Pro",
    description: "AutoCity Pro dashboard for managing business operations.",
    url: "https://autocityqatar.com/autocityPro/login",
    siteName: "AutoCity Pro",
    type: "website",
    images: [
      {
        url: "https://autocityqatar.com/logo.png",
        width: 1200,
        height: 630,
        alt: "AutoCity Pro Logo",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    title: "AutoCity Pro",
    description: "AutoCity Pro dashboard for sales, stock, and reporting.",
    images: ["https://autocityqatar.com/logo.png"],
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