import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://x-com.fun"),
  title: {
    default: "X-COM — Crypto Communities",
    template: "%s | X-COM",
  },
  description:
    "The home for crypto communities. Create a space for your project, post updates, and everything syncs to X. All the signal, none of the noise.",
  openGraph: {
    title: "X-COM — Crypto Communities",
    description: "The home for crypto communities. Post here, it goes to X.",
    siteName: "X-COM",
    url: "https://x-com.fun",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "X-COM — Crypto Communities",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "X-COM — Crypto Communities",
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
        {children}
      </body>
    </html>
  );
}
