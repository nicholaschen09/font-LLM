import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FontLens",
  description: "Identify fonts from images with LLM vision."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
