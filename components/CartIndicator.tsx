"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/context";

export default function CartIndicator({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const { count } = useCart();

  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-orange hover:text-brand-blue"
    >
      <span className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className="h-5 w-5"
        >
          <path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 7H6" />
          <circle cx="10" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-brand-navy">
            {count}
          </span>
        )}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
