"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { importCatalogue, type ImportState } from "@/lib/actions/admin/catalogue-import";
import type { Locale } from "@/lib/i18n/config";

export interface ImportLabels {
  file: string;
  fileHint: string;
  simulate: string;
  apply: string;
  running: string;
  created: string;
  updated: string;
  skipped: string;
  recognised: string;
  ignored: string;
  problems: string;
  dryRunNotice: string;
  appliedNotice: string;
  nothingToApply: string;
}

function ActionButton({
  label,
  pendingLabel,
  mode,
  primary,
}: {
  label: string;
  pendingLabel: string;
  mode: "simulate" | "apply";
  primary?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="mode"
      value={mode}
      disabled={pending}
      className={`inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold disabled:opacity-60 ${
        primary
          ? "bg-brand-navy text-white hover:bg-brand-blue"
          : "border border-brand-navy text-brand-navy hover:bg-slate-50"
      }`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Import d'un tarif fournisseur.
 *
 * Le bouton « Simuler » précède toujours le bouton « Importer » : sur un
 * catalogue de neuf mille références, un fichier mal aligné se rattrape mal.
 * L'écran montre d'abord ce qui serait fait, et l'import réel ne devient
 * disponible qu'une fois la simulation passée.
 */
export default function CatalogueImportForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: ImportLabels;
}) {
  const [state, action] = useActionState<ImportState, FormData>(importCatalogue, {
    error: null,
    report: null,
  });
  const [hasFile, setHasFile] = useState(false);

  const report = state.report;
  const simulated = report?.dryRun === true;

  return (
    <div className="mt-6 max-w-3xl">
      <form action={action} className="rounded-lg border border-slate-200 bg-white p-4">
        <input type="hidden" name="locale" value={locale} />

        <label className="block">
          <span className="text-sm font-medium text-slate-700">{labels.file}</span>
          <input
            type="file"
            name="file"
            accept=".csv,.xlsx,.xls,text/csv"
            required
            onChange={(event) => setHasFile((event.target.files?.length ?? 0) > 0)}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-blue"
          />
          <span className="mt-1 block text-xs text-slate-500">{labels.fileHint}</span>
        </label>

        {state.error && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {state.error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <ActionButton label={labels.simulate} pendingLabel={labels.running} mode="simulate" />
          {simulated && hasFile && (
            <ActionButton
              label={labels.apply}
              pendingLabel={labels.running}
              mode="apply"
              primary
            />
          )}
        </div>

        {simulated && !hasFile && (
          <p className="mt-3 text-xs text-slate-500">{labels.nothingToApply}</p>
        )}
      </form>

      {report && (
        <section
          className={`mt-4 rounded-lg border p-4 ${
            report.dryRun
              ? "border-brand-orange/50 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            {report.dryRun ? labels.dryRunNotice : labels.appliedNotice}
          </p>

          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Stat value={report.created} label={labels.created} tone="text-emerald-700" />
            <Stat value={report.updated} label={labels.updated} tone="text-brand-blue" />
            <Stat value={report.skipped} label={labels.skipped} tone="text-red-700" />
          </dl>

          {Object.keys(report.recognised).length > 0 && (
            <p className="mt-4 text-xs text-slate-600">
              <span className="font-semibold">{labels.recognised} : </span>
              {Object.entries(report.recognised)
                .map(([header, field]) => `${header} → ${field}`)
                .join(" · ")}
            </p>
          )}

          {report.ignored.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-semibold">{labels.ignored} : </span>
              {report.ignored.join(", ")}
            </p>
          )}

          {report.problems.length > 0 && (
            <div className="mt-3 border-t border-black/10 pt-3">
              <p className="text-xs font-semibold text-slate-700">{labels.problems}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {report.problems.map((problem, index) => (
                  <li key={index}>— {problem}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="rounded-md bg-white/70 p-3">
      <dd className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</dd>
      <dt className="text-xs text-slate-600">{label}</dt>
    </div>
  );
}
