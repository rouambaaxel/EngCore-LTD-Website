import Link from "next/link";
import Image from "next/image";
import { localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href={localePath(locale, "/")} className="mb-8">
        <Image
          src="/logo.png"
          alt="Engcore Ltd — Expertise and reliability"
          width={392}
          height={137}
          className="h-12 w-auto"
          priority
        />
      </Link>
      {/*
        `main` et non `div` : sans ce repère, un lecteur d'écran n'a aucun
        moyen de sauter directement au formulaire, et les pages publiques, qui
        ont le leur, se comportaient différemment de celles-ci.
      */}
      <main className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </main>
    </div>
  );
}
