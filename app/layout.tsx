import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/martian-mono/wdth.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";

const title = "NEURAL // 00 — Artificial Intelligence Visualized";
const description =
  "An immersive interactive 3D exploration of artificial intelligence, neural systems and machine perception.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title,
  description,
  applicationName: "NEURAL // 00",
  keywords: ["artificial intelligence", "neural network", "three.js", "webgl", "interactive", "visualization"],
  openGraph: {
    type: "website",
    title,
    description,
    siteName: "NEURAL // 00",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#030406",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
