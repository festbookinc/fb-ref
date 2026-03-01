import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { RefreshProvider } from "@/contexts/RefreshContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { UploadProvider } from "@/contexts/UploadContext";
import { Navbar } from "@/components/Navbar";
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
  title: "FB Ref. | 이미지 아카이브",
  description: "구성원들의 이미지 레퍼런스 업로드·공유·검색",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen overflow-x-hidden bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <SessionProvider>
            <RefreshProvider>
              <SearchProvider>
                <UploadProvider>
                  <div className="flex min-h-screen flex-col overflow-x-hidden">
                  <Navbar />
                  <main className="flex-1 pb-16 md:pb-0">{children}</main>
                  </div>
                </UploadProvider>
              </SearchProvider>
            </RefreshProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
