import { createClient } from "@/lib/supabase/server";
import CreateOrderForm from "@/components/CreateOrderForm";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Profile } from "@/lib/types";

async function getClients(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .order("company_name");
  return data ?? [];
}

export default async function NouvelleCommandePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const clients = await getClients();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.newOrderTitle}</h1>
      <CreateOrderForm clients={clients} locale={locale} t={t} />
    </div>
  );
}
