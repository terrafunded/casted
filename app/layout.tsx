import type { Metadata, Viewport } from "next";
import { Fraunces, Oswald } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const gothic = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-gothic",
});

export const metadata: Metadata = {
  title: "CASTED — A Picture",
  description:
    "One midnight studio. One film. Your face, one chapter, five seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070503",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${gothic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
