import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/QueryProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { LocaleProvider } from "@/lib/i18n";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ToastContainer } from "@/components/Toast";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ibTech — Sales Operation Managing Dashboard",
  description: "Sales Operation Managing Dashboard for RFID solutions",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/favicon-192.png", sizes: "192x192" }],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ServiceWorkerRegister />
        <ThemeProvider>
          <LocaleProvider>
            <QueryProvider>
              <ConfirmProvider>
                {children}
                <ToastContainer />
              </ConfirmProvider>
            </QueryProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
