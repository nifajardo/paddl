import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/context/StoreContext";
import { Toaster } from "sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paddl+ Pro - Next-Gen Cloud POS & MSME Bookkeeping",
  description:
    "Production-grade POS, inventory, debt book, and expense ledger built for Philippine MSMEs and retail stores.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased font-sans`}
    >
      <body className="h-full w-full overflow-hidden flex flex-col bg-slate-100 font-sans">
        <StoreProvider>
          {children}
          <Toaster richColors position="top-right" duration={2500} />
        </StoreProvider>
      </body>
    </html>
  );
}
