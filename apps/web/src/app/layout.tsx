import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider, I18nProvider } from "@repo/ui";
import { SessionBridge } from "../providers/session-bridge";
import { tr, en } from "../i18n";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "GlassOS",
  description: "Glass Manufacturing ERP System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tRenderStart = Date.now();
  console.log(`[PERF_LOG] [${tRenderStart}] [9. React Server Component render başlangıcı]`);
  
  const res = (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <I18nProvider dictionaries={{ tr, en }} defaultLocale="tr">
            <SessionBridge>{children}</SessionBridge>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  console.log(`[PERF_LOG] [${Date.now()}] [10. React render bitişi] - Rendered RootLayout (Duration: ${Date.now() - tRenderStart}ms)`);
  console.log(`[PERF_LOG] [${Date.now()}] [11. HTML response gönderildi] - Sending HTML`);
  return res;
}
