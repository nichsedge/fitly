import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./components/AppProvider";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Fitly – Local-First Digital Wardrobe",
  description: "Organize your wardrobe digitally offline. Add clothes, build outfits, and dress with confidence.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fitly",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "application-name": "Fitly",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={plusJakartaSans.variable}>
        <ServiceWorkerRegister />
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
