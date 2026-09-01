"use client";

import { useActionState } from "react";
import { createProduct, updateProduct, type ProductActionState } from "@/lib/actions/admin/products";
import { specsToText } from "@/lib/specs";
import type { Dictionary } from "@/lib/i18n";
import { categoryName } from "@/lib/i18n/category";
import type { Locale } from "@/lib/i18n/config";
import type { Category, Product } from "@/lib/types";

const initialState: ProductActionState = { error: null };

export default function ProductForm({
  categories,
  product,
  locale,
  t,
}: {
  categories: Category[];
  product?: Product;
  locale: Locale;
  t: Dictionary;
}) {
  const action = product ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, initialState);
  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <form action={formAction} className="mt-6 max-w-xl space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            {t.admin.name} *
          </label>
          <input id="name" name="name" type="text" required defaultValue={product?.name} className={field} />
        </div>
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-slate-700">
            {t.admin.reference} *
          </label>
          <input
            id="reference"
            name="reference"
            type="text"
            required
            defaultValue={product?.reference}
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-slate-700">
            {t.admin.category}
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id ?? ""}
            className={field}
          >
            <option value="">—</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {categoryName(category, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-slate-700">
            {t.admin.brand}
          </label>
          <input
            id="brand"
            name="brand"
            type="text"
            defaultValue={product?.brand ?? ""}
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="image_url" className="block text-sm font-medium text-slate-700">
          {t.admin.imageUrl}
        </label>
        <input
          id="image_url"
          name="image_url"
          type="text"
          defaultValue={product?.image_url ?? ""}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          {t.admin.description}
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="specs" className="block text-sm font-medium text-slate-700">
          {t.admin.datasheet}
        </label>
        <textarea
          id="specs"
          name="specs"
          rows={5}
          defaultValue={specsToText(product?.specs)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs focus:border-brand-blue focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">{t.admin.datasheetHint}</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="is_visible"
          defaultChecked={product?.is_visible ?? true}
          className="rounded border-slate-300"
        />
        {t.admin.visiblePublicly}
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.admin.saving : product ? t.admin.save : t.admin.createProduct}
      </button>
    </form>
  );
}
