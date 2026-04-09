import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "XCOM — Crypto Communities",
    template: "%s | XCOM",
  },
  description:
    "The home for crypto communities. Create a space for your project, post updates, and everything syncs to X. All the signal, none of the noise.",
  openGraph: {
    title: "XCOM — Crypto Communities",
    description: "The home for crypto communities. Post here, it goes to X.",
    siteName: "XCOM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XCOM — Crypto Communities",
    description: "The home for crypto communities. Post here, it goes to X.",
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
