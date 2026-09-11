import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Education Intelligence | Aotearoa",
  description: "New Zealand education news, policy and evidence. Explore source-linked intelligence and download research packs for AI-assisted analysis.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
