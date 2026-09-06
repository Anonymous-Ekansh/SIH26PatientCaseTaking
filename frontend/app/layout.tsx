import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";
import { LanguageProvider } from "./lib/language-context";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MediKiosk | AI-Powered Patient Case-Taking",
  description:
    "MediKiosk listens, scans, and prepares a complete patient history for your doctor, in the language you speak, before your consultation even starts.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <LanguageProvider initialLocale={locale as "en" | "hi"}>{children}</LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
