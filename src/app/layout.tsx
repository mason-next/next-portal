import type { Metadata } from "next";
import { Geist_Mono, Google_Sans_Flex } from "next/font/google";
import { Header } from "@/components/shared/AppShell/Header";
import "./globals.css";

const googleSansFlex = Google_Sans_Flex({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXT Portal",
  description:
    "Internal operations platform for project execution, procurement, engineering, field operations, reporting, and customer communications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${googleSansFlex.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1 bg-muted/30">{children}</main>
      </body>
    </html>
  );
}
