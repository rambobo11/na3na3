import type { Metadata, Viewport } from "next";
import { Manrope, Outfit } from "next/font/google";
import { APPLE_SPLASH } from "@/lib/apple-splash";
import { Providers } from "./providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Na3Na3",
  description: "Na3Na3",
  applicationName: "Na3Na3",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Na3Na3",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1210" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        {APPLE_SPLASH.map(({ href, media }) => (
          <link
            key={href}
            rel="apple-touch-startup-image"
            href={href}
            media={media}
          />
        ))}
      </head>
      <body className="min-h-full font-[family-name:var(--font-body)] overscroll-none">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
