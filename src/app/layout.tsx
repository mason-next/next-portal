import type { Metadata } from "next";
import { Geist_Mono, Google_Sans_Flex } from "next/font/google";
import { Header } from "@/components/shared/AppShell/Header";
import { UsersProvider } from "@/components/shared/AppShell/UsersProvider";
import { NotificationsProvider } from "@/modules/notifications/hooks/NotificationsContext";
import { SessionProvider } from "@/lib/auth/client";
import { getServerSession } from "@/lib/auth/server";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html
      lang="en"
      className={`${googleSansFlex.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider user={session}>
          <UsersProvider>
            <NotificationsProvider>
              <Header />
              <main className="flex-1 bg-muted/30">{children}</main>
            </NotificationsProvider>
          </UsersProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
