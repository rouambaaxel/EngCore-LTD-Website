import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumbs({
  items,
  label = "Fil d'Ariane",
}: {
  items: Crumb[];
  label?: string;
}) {
  return (
    <nav aria-label={label} className="text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-slate-300">/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex min-h-8 items-center hover:text-brand-blue"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-700">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
