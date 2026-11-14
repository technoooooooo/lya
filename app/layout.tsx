import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { BRAND_NAME, BRAND_SHORT } from "@/lib/brand";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: BRAND_NAME,
  description: "Assistant IA dédié au coaching golf, prolongement numérique de la méthode de Mathieu.",
};

// - maximumScale 1 : empêche le zoom automatique de Safari iOS au focus d'un
//   champ (le zoom au pincement reste possible, iOS l'autorise toujours) ;
// - viewportFit cover : donne accès aux env(safe-area-inset-*) (encoche,
//   barre d'accueil) une fois l'app installée sur l'écran d'accueil ;
// - interactiveWidget resizes-content : sur Android, le clavier réduit la
//   page au lieu de la recouvrir, le champ de saisie reste au-dessus.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#09090b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={BRAND_SHORT} />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
