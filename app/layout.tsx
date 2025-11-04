import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/providers/session-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { NotificationProvider } from "@/contexts/notification-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Employee Dashboard",
  description: "Employee management and attendance tracking system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <SessionProviderWrapper>
            <NotificationProvider>
              {children}
              <Toaster />
            </NotificationProvider>
          </SessionProviderWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}
