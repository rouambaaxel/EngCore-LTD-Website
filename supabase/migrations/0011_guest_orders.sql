-- Engcore Ltd — commande pour un destinataire sans compte.
--
-- Un acheteur écrit à la boîte mail, demande vingt références, valide par
-- retour de message et paie par virement. Lui imposer un compte avant de
-- pouvoir saisir sa commande, c'est lui demander de s'inscrire pour un achat
-- qu'il a déjà décidé — et nous empêcher de travailler en attendant.
--
-- La commande existe donc sans compte. Ce qu'elle laisse voir se sépare en
-- deux : l'acheminement, consultable par qui détient le numéro — c'est déjà
-- le cas depuis la migration 0008 —, et le reste (lignes, montants, factures,
-- règlement en ligne), qui n'est accessible que depuis un espace client.
--
-- Le rattachement au compte passe par l'invitation : l'adresse y est attestée
-- par nous, et `accept_invitation` vérifie que le compte créé porte bien
-- celle-là. Un rattachement sur simple correspondance d'adresse, sans ce
-- détour, offrirait les commandes d'autrui à qui devine une adresse — la
-- confirmation par email étant désactivée.

-- ============================================================
-- 1. Le destinataire n'est plus forcément un compte
-- ============================================================

alter table public.orders alter column client_id drop not null;

alter table public.orders
  -- Coordonnées du destinataire tant qu'il n'a pas de compte. Conservées
  -- après rattachement : c'est à ces coordonnées que l'affaire s'est faite,
  -- et `client_id` suffit à savoir si la commande a rejoint un espace.
  add column if not exists guest_email text,
  add column if not exists guest_name text,
  add column if not exists guest_company text,
  add column if not exists guest_phone text;

-- Une commande sans compte ni adresse ne serait transmissible à personne.
alter table public.orders drop constraint if exists orders_recipient_check;
alter table public.orders
  add constraint orders_recipient_check
  check (client_id is not null or nullif(btrim(guest_email), '') is not null);

create index if not exists orders_guest_email_idx
  on public.orders (lower(guest_email))
  where client_id is null;

-- Les policies existantes comparent `client_id` à `auth.uid()`. Un
-- `client_id` nul n'égale rien : les commandes sans compte sont donc
-- invisibles à tous les clients, et aucun ne peut y démarrer de paiement.
-- Rien à modifier — c'est exactement l'effet voulu.

-- ============================================================
-- 2. L'invitation rattache aussi les commandes
-- ============================================================

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

  -- Les commandes saisies pour cette adresse avant qu'elle ait un compte le
  -- rejoignent : lignes, montants et règlement deviennent visibles d'un coup.
  -- L'adresse est celle que nous avons écrite nous-mêmes sur l'invitation, et
  -- le jeton prouve que son porteur l'a reçue.
  update public.orders
  set client_id = v_user
  where client_id is null
    and lower(btrim(coalesce(guest_email, ''))) = v_email;

  return true;
end;
$$;

revoke execute on function public.accept_invitation(text) from public;
revoke execute on function public.accept_invitation(text) from anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ============================================================
-- 3. Combien de commandes attendent une adresse donnée
-- ============================================================
--
-- Sert à l'écran d'invitation du back-office : annoncer « 2 commandes
-- rejoindront ce compte » dit à l'administrateur que le lien qu'il envoie
-- fait plus qu'ouvrir un accès.

create or replace function public.guest_orders_for(p_email text)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.orders
  where client_id is null
    and lower(btrim(coalesce(guest_email, ''))) = lower(btrim(coalesce(p_email, '')))
    and btrim(coalesce(p_email, '')) <> ''
    and public.is_admin();
$$;

revoke execute on function public.guest_orders_for(text) from public;
revoke execute on function public.guest_orders_for(text) from anon;
grant execute on function public.guest_orders_for(text) to authenticated;
