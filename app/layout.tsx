import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Constlingo — 声で身につける語学練習",
  description: "見て、思い出して、声にする。基本語彙を短い演習で身につける語学学習アプリ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
