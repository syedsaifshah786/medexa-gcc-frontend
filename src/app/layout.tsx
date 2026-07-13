import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DoctorProvider } from "@/components/DoctorContext";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medexa GCC Session",
  description: "Medexa GCC clinical session prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <DoctorProvider>{children}</DoctorProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
