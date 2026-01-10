import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AutoCity Pro",
    template: "%s | AutoCity Pro",
  },

  description:
    "AutoCity Pro dashboard for managing sales, inventory, and reports.",

  manifest: "/manifest.json",

  // 🔥 THIS IS WHAT YOU WERE MISSING
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
    description:
      "AutoCity Pro dashboard for managing business operations.",
    url: "https://autocityqatar.com/autocitypro/login",
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
    description:
      "AutoCity Pro dashboard for sales, stock, and reporting.",
    images: ["https://autocityqatar.com/logo_og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
