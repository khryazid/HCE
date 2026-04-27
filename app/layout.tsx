import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SyncBootstrap } from "@/components/ui/sync-bootstrap";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HCE Multiespecialidad",
  description:
    "Plataforma SaaS offline-first para gestion de historias clinicas multiespecialidad con enfoque multi-tenant.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="es"
        className={`${inter.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-bg text-ink font-sans">
        <SyncBootstrap />
        {children}
      </body>
    </html>
  );
}
