import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jugalbandi — Chat. Connect. Together.",
  description: "A next-generation futuristic messaging platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}