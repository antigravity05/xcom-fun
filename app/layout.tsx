import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.x-com.fun"),
  title: {
    default: "x-com.fun — Crypto Communities",
    template: "%s | x-com.fun",
  },
  description:
    "The home for crypto communities. Create a space for your project, post updates, and everything syncs to X. All the signal, none of the noise.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.png",
  },
  openGraph: {
    title: "x-com.fun — Crypto Communities",
    description: "The home for crypto communities. Post here, it goes to X.",
    siteName: "x-com.fun",
    url: "https://www.x-com.fun",
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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
