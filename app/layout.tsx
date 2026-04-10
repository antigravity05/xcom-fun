import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://x-com.fun"),
  title: {
    default: "x-com.fun — Crypto Communities",
    template: "%s | x-com.fun",
  },
  description:
    "The home for crypto communities. Create a space for your project, post updates, and everything syncs to X. All the signal, none of the noise.",
  openGraph: {
    title: "x-com.fun — Crypto Communities",
    description: "The home for crypto communities. Post here, it goes to X.",
    siteName: "x-com.fun",
    url: "https://x-com.fun",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "x-com.fun — Crypto Communities",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "x-com.fun — Crypto Communities",
    description: "The home for crypto communities. Post here, it goes to X.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
