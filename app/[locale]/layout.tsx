import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/payments/config";
import { CartProvider } from "@/lib/cart/context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const base = siteUrl();

  return {
    // Sans cette base, Next rend les URL canoniques en relatif, ce qu'aucun
    // moteur n'exploite. Elle rend aussi absolues les images de partage.
    metadataBase: new URL(base),
    title: t.meta.title,
    description: t.meta.description,
    alternates: {
      canonical: `${base}/${locale}`,
      // Les deux versions traitent du même sujet. Sans ce lien, Google les
      // tient pour concurrentes et n'en retient qu'une, au hasard.
      languages: Object.fromEntries(
        LOCALES.map((other) => [other, `${base}/${other}`]),
      ),
    },
    openGraph: {
      type: "website",
      siteName: "Engcore Ltd",
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      url: `${base}/${locale}`,
      title: t.meta.title,
      description: t.meta.description,
      images: [{ url: "/logo.png", width: 392, height: 137, alt: "Engcore Ltd" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
