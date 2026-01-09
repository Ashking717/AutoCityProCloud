import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AutoCity Qatar – Automotive Parts, Accessories & Services",
    template: "%s | AutoCity Qatar",
  },
  description:
    "AutoCity Qatar provides premium automotive parts, accessories, and professional services for all vehicle needs across Qatar.",

  openGraph: {
    title: "AutoCity Qatar – Automotive Parts, Accessories & Services",
    description:
      "Premium automotive parts, accessories, and expert automotive services in Qatar.",
    url: "https://autocityqatar.com",
    siteName: "AutoCity Qatar",
    type: "website",
    images: [
      {
        url: "https://autocityqatar.com/logo.png",
        width: 1200,
        height: 630,
        alt: "AutoCity Qatar Logo",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AutoCity Qatar – Automotive Parts, Accessories & Services",
    description:
      "Premium automotive parts, accessories, and expert services in Qatar.",
    images: ["https://autocityqatar.com/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
