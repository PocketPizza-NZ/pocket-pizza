import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pocket Pizza NZ — Halal Detroit-Sicilian Pizza Auckland | Order Online",
  description:
    "Auckland's only 100% halal Detroit-Sicilian pizza. Movie-named single-serve pies from $10. Crispy frico edges, thick focaccia base. Order online for delivery across West & central Auckland.",
  keywords: [
    "halal pizza Auckland",
    "Detroit style pizza Auckland",
    "Sicilian pizza Auckland",
    "Pocket Pizza NZ",
    "halal pizza West Auckland",
    "online pizza order Auckland",
  ],
  authors: [{ name: "Pocket Pizza NZ" }],
  openGraph: {
    title: "Pocket Pizza NZ — Halal Detroit-Sicilian Pizza",
    description:
      "100% halal. Crispy frico edges. Thick focaccia base. Movie-named single-serve pies from $10. Order online for Auckland delivery.",
    url: "https://pocketpizza.co.nz",
    siteName: "Pocket Pizza NZ",
    type: "website",
    locale: "en_NZ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocket Pizza NZ — Halal Detroit-Sicilian Pizza",
    description:
      "Movie-named pies from $10. 100% halal. Order online for Auckland delivery.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NZ" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
