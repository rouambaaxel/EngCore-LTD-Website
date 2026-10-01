import Link from "next/link";
import CatalogueImportForm from "@/components/CatalogueImportForm";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function ImportCataloguePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  return (
    <div className="max-w-3xl">
      <Link href={p("/admin/produits")} className="text-sm text-brand-blue hover:underline">
        ← {t.admin.products}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">{t.admin.importTitle}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.admin.importIntro}</p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.admin.importColumns}
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1 pr-4 font-semibold">{t.admin.importColumn}</th>
                <th className="py-1 pr-4 font-semibold">{t.admin.importAccepted}</th>
                <th className="py-1 font-semibold">{t.admin.importRequired}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                ["Référence", "reference, ref, part number, code", true],
                ["Désignation", "name, nom, désignation, libellé", true],
                ["Catégorie", "category, catégorie, rayon, famille", false],
                ["Marque", "brand, marque, fabricant", false],
                ["Description", "description, descriptif", false],
                ["Image", "image, image_url, photo", false],
                ["Visible", "visible, actif", false],
              ].map(([label, aliases, required]) => (
                <tr key={String(label)}>
                  <td className="py-1.5 pr-4 font-medium text-slate-900">{label}</td>
                  <td className="py-1.5 pr-4 font-mono text-xs text-slate-600">{aliases}</td>
                  <td className="py-1.5 text-xs">
                    {required ? (
                      <span className="font-semibold text-brand-navy">
                        {t.admin.importYes}
                      </span>
                    ) : (
                      <span className="text-slate-400">{t.admin.importNo}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-600">{t.admin.importKeyNote}</p>
        <p className="mt-1 text-xs text-slate-600">{t.admin.importCategoryNote}</p>
      </section>

      <CatalogueImportForm
        locale={locale}
        labels={{
          file: t.admin.importFile,
          fileHint: t.admin.importFileHint,
          simulate: t.admin.importSimulate,
          apply: t.admin.importApply,
          running: t.admin.saving,
          created: t.admin.importCreated,
          updated: t.admin.importUpdated,
          skipped: t.admin.importSkipped,
          recognised: t.admin.importRecognised,
          ignored: t.admin.importIgnored,
          problems: t.admin.importProblems,
          dryRunNotice: t.admin.importDryRunNotice,
          appliedNotice: t.admin.importAppliedNotice,
          nothingToApply: t.admin.importReselect,
        }}
      />
    </div>
  );
}
