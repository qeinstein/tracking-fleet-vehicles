import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lagos Fleet Tracker — Real-Time 3D Vehicle Monitoring",
  description:
    "A real-time fleet tracker rendering live 3D vehicles on a Lagos street map, powered by a high-concurrency Java backend (JCIP Monitor Pattern).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans text-slate-900 bg-[#f6f7f5]">{children}</body>
    </html>
  );
}
