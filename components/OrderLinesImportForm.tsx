"use client";

import { useActionState } from "react";
import {
  importOrderLines,
  type LineImportState,
} from "@/lib/actions/admin/order-lines-import";
import type { Locale } from "@/lib/i18n/config";

const initialState: LineImportState = { error: null, report: null };

export interface LineImportLabels {
  title: string;
  hint: string;
  submit: string;
  running: string;
  added: string;
  matched: string;
  freeText: string;
  recognised: string;
  ignored: string;
  problems: string;
}

/**
 * Import des lignes d'une commande depuis le fichier du client.
 *
 * Volontairement discret : c'est un raccourci de saisie, pas l'opération
 * principale de l'écran. Il se replie en un simple champ de fichier tant
 * qu'on ne s'en sert pas.
 */
export default function OrderLinesImportForm({
  orderId,
  locale,
  labels,
}: {
  orderId: string;
  locale: Locale;
  labels: LineImportLabels;
}) {
  const [state, action, pending] = useActionState<LineImportState, FormData>(
    importOrderLines,
    initialState,
  );

  const report = state.report;

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {labels.title}
      </h3>

      <form action={action} className="mt-2 flex flex-wrap items-center gap-3">
        <input type="hidden" name="order_id" value={orderId} />
        <input type="hidden" name="locale" value={locale} />
        <input
          type="file"
          name="file"
          accept=".csv,.xlsx,.xls,text/csv"
          required
          className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-navy hover:file:bg-slate-200"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-md border border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? labels.running : labels.submit}
        </button>
      </form>

      <p className="mt-2 text-xs text-slate-500">{labels.hint}</p>

      {state.error && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      {report && (
        <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
          <p className="font-semibold text-slate-900">
            {report.added} {labels.added}
          </p>
          <p className="mt-0.5 text-xs text-slate-700">
            {report.matched} {labels.matched} · {report.freeText} {labels.freeText}
          </p>

          {Object.keys(report.recognised).length > 0 && (
            <p className="mt-2 text-xs text-slate-600">
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
            <ul className="mt-2 space-y-0.5 border-t border-emerald-200 pt-2 text-xs text-slate-600">
              {report.problems.map((problem, index) => (
                <li key={index}>— {problem}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
