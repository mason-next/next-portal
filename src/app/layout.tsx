import type { Metadata, Viewport } from "next";
import { Geist_Mono, Google_Sans_Flex } from "next/font/google";
import { Header } from "@/components/shared/AppShell/Header";
import { ViewAsBanner } from "@/components/shared/AppShell/ViewAsBanner";
import { UsersProvider } from "@/components/shared/AppShell/UsersProvider";
import { NotificationsProvider } from "@/modules/notifications/hooks/NotificationsContext";
import { PermissionsProvider } from "@/lib/PermissionsContext";
import { SessionProvider } from "@/lib/auth/client";
import { ViewAsProvider } from "@/lib/view-as/ViewAsContext";
import { getServerSession } from "@/lib/auth/server";
import "./globals.css";

const googleSansFlex = Google_Sans_Flex({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  adjustFontFallback: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mason NEXT Portal",
  description:
    "Internal operations platform for project execution, procurement, engineering, field operations, reporting, and customer communications.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  const htmlClass = `${googleSansFlex.variable} ${geistMono.variable} h-full antialiased`;

  // No session = login page (middleware ensures only /login reaches here unauthenticated)
  if (!session) {
    return (
      <html lang="en" className={htmlClass}>
        <body className="min-h-full">{children}</body>
      </html>
    );
  }

  return (
    <html lang="en" className={htmlClass}>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <SessionProvider user={session}>
          <ViewAsProvider>
            <PermissionsProvider>
              <UsersProvider>
                <NotificationsProvider>
                  <Header />
                  <ViewAsBanner />
                  <main className="flex-1 bg-muted/30">{children}</main>
                </NotificationsProvider>
              </UsersProvider>
            </PermissionsProvider>
          </ViewAsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
