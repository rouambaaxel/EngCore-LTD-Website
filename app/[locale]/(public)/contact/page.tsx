import QuoteRequestForm from "@/components/QuoteRequestForm";
import { getProductBySlug } from "@/lib/catalogue";
import { getReconditioningService } from "@/lib/reconditioning";
import { getSignedInContact } from "@/lib/quotes/contact";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ produit?: string; service?: string }>;
}) {
  const { locale: raw } = await params;
  const { produit, service } = await searchParams;

  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const contact = await getSignedInContact(p("/compte/profil"));
  const product = produit ? await getProductBySlug(produit) : null;
  const reconditioningService = service
    ? getReconditioningService(service, locale)
    : undefined;

  const subjectLabel = product
    ? product.name
    : reconditioningService
      ? `${t.reconditioning.sectionTitle} — ${reconditioningService.title}`
      : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.contact.title}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.contact.intro}</p>

      <div className="mt-8">
        <QuoteRequestForm
          productId={product?.id}
          productLabel={subjectLabel}
          locale={locale}
          t={t}
          contact={contact}
          signUpHref={p("/inscription")}
          signInHref={p("/connexion")}
        />
      </div>
    </div>
  );
}
