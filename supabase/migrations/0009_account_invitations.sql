-- Engcore Ltd — invitations à ouvrir un compte.
--
-- La validation manuelle protège d'un inconnu qui s'inscrit. Elle n'a aucun
-- sens quand c'est nous qui allons chercher le client : un acheteur rencontré
-- sur un salon, un donneur d'ordre qui écrit directement à la boîte mail, un
-- client de longue date qu'on bascule sur la plateforme. Celui-là, on le
-- connaît déjà — l'inviter revient à l'avoir validé.
--
-- L'invitation porte donc deux choses : la preuve que nous sommes à
-- l'origine du compte, et la validation par avance.

-- ============================================================
-- 1. La table
-- ============================================================

create table if not exists public.account_invitations (
  id uuid primary key default gen_random_uuid(),
  -- Normalisé en minuscules : l'invitation vaut pour une adresse, et
  -- « Achat@Client.com » est la même que « achat@client.com ».
  email text not null,
  -- Secret du lien. Il tient lieu de preuve : qui l'a, a été invité.
  token text not null unique,
  -- Pré-remplissage du formulaire, pour épargner la saisie au client.
  company_name text,
  contact_name text,
  -- Mémo interne : « rencontré au salon de Lagos », « ex-client compte 4412 ».
  note text,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz
);

create index if not exists account_invitations_email_idx
  on public.account_invitations (lower(email));

create index if not exists account_invitations_created_idx
  on public.account_invitations (created_at desc);

alter table public.account_invitations enable row level security;

-- Personne d'autre que l'équipe ne lit cette table. Un invité n'y accède
-- jamais directement : il passe par les deux fonctions ci-dessous, qui ne
-- rendent que ce dont le formulaire d'inscription a besoin.
create policy "Admins manage invitations" on public.account_invitations
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 2. Ce que le formulaire d'inscription peut lire
-- ============================================================
--
-- Rien de plus que ce qu'il affiche. Un jeton inventé ne distingue pas une
-- invitation inexistante d'une invitation expirée : les deux ne rendent rien.

create or replace function public.invitation_details(p_token text)
returns table (email text, company_name text, contact_name text)
language sql
security definer
set search_path = public
stable
as $$
  select i.email, i.company_name, i.contact_name
  from public.account_invitations i
  where i.token = p_token
    and coalesce(length(p_token), 0) >= 16
    and i.accepted_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  limit 1;
$$;

grant execute on function public.invitation_details(text) to anon, authenticated;

-- ============================================================
-- 3. Consommation de l'invitation
-- ============================================================
--
-- Appelée juste après l'inscription, par le compte qui vient de naître.
-- Deux conditions : le jeton est valide, et l'adresse du compte est bien
-- celle invitée. Sans ce second contrôle, un lien transféré ouvrirait un
-- compte validé d'office à n'importe qui.

create or replace function public.accept_invitation(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_invitation public.account_invitations;
begin
  if v_user is null then
    return false;
  end if;

  select lower(btrim(u.email)) into v_email from auth.users u where u.id = v_user;
  if v_email is null then
    return false;
  end if;

  select * into v_invitation
  from public.account_invitations
  where token = p_token
    and coalesce(length(p_token), 0) >= 16
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found or lower(btrim(v_invitation.email)) <> v_email then
    return false;
  end if;

  update public.account_invitations
  set accepted_at = now(), accepted_by = v_user
  where id = v_invitation.id;

  -- `prevent_role_change` annule toute validation faite hors session
  -- administrateur — c'est son rôle. Ici la validation vient de nous, par
  -- avance, et la fonction vient de le vérifier.
  perform set_config('app.bypass_profile_guard', 'on', true);

  update public.profiles
  set status = 'approved',
      approved_at = coalesce(approved_at, now()),
      approved_by = coalesce(approved_by, v_invitation.invited_by),
      company_name = coalesce(nullif(btrim(company_name), ''), v_invitation.company_name),
      contact_name = coalesce(nullif(btrim(contact_name), ''), v_invitation.contact_name)
  where id = v_user;

  perform set_config('app.bypass_profile_guard', 'off', true);

  return true;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;

-- ============================================================
-- 4. Le garde-fou apprend la porte dérobée
-- ============================================================
--
-- Même forme que `app.bypass_quote_guard` : la fonction qui a vérifié elle-
-- même les droits lève le garde-fou le temps de son écriture, et le repose.

create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.bypass_profile_guard', true), '') = 'on' then
    return new;
  end if;

  -- `auth.uid()` est nul hors session : éditeur SQL, migrations, clé de
  -- service. Sans cette porte, la promotion d'un compte en administrateur
  -- documentée dans le README serait silencieusement annulée par ce trigger,
  -- et le premier administrateur ne pourrait jamais être créé.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      new.role := old.role;
    end if;
    if new.status is distinct from old.status then
      new.status := old.status;
    end if;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
  end if;
  return new;
end;
$$;
