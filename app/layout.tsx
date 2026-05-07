import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Knowledge Diagnosis Map",
  description: "AI-powered course map and mistake diagnosis workspace"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
