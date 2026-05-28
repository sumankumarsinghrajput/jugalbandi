import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jugalbandi — Chat. Connect. Together.",
  description: "A next-generation futuristic messaging platform",
  manifest: "/manifest.json",
  themeColor: "#1a6fff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jugalbandi",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#1a6fff" />
      </head>
      <body>
  {children}
  <script dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js');
        });
      }
    `
  }} />
</body>
    </html>
  );
}