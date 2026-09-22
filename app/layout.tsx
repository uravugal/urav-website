import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NavProgressTracker } from "@/components/NavProgress";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "URAV — Empowering Careers. Building Futures.",
  description:
    "URAV is a corporate consulting and career platform connecting students, professionals and organizations through learning, webinars and job opportunities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <Suspense fallback={null}>
          <NavProgressTracker />
        </Suspense>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
