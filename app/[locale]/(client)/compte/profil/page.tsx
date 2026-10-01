import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import PasswordForm from "@/components/PasswordForm";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Profile } from "@/lib/types";

async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
}

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const profile = await getProfile();
  if (!profile) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t.account.myProfile}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.account.profileIntro}</p>
      <ProfileForm profile={profile} locale={locale} t={t} />

      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          {t.account.passwordSection}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t.account.passwordIntro}</p>
        <PasswordForm locale={locale} t={t} />
      </section>
    </div>
  );
}
