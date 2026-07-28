import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real-Time Concurrency Fleet Tracker (3D JCIP Monitor Pattern)",
  description: "High-performance 3D fleet vehicle tracker evaluating JCIP Section 4.2.2 Java Monitor Pattern with Deck.gl and MapLibre GL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#070a11] text-slate-100 font-sans h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
