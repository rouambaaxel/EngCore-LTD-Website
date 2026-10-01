-- ============================================================================
-- Engcore Ltd — installation complete de la base
--
-- Fichier unique : copiez TOUT son contenu et collez-le dans le SQL Editor de
-- Supabase, puis cliquez sur « Run ». Il reunit les deux migrations, dans le
-- bon ordre. Rien d'autre n'est a executer a la main.
--
-- Genere par scripts/build-install-sql.mjs — ne pas editer.
-- ============================================================================

-- Engcore Ltd — schéma initial
-- Extension nécessaire pour gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================
-- Tables
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_name text,
  contact_name text,
  phone text,
  address text,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  -- Libellés anglais ; le site retombe sur le français s'ils sont vides.
  name_en text,
  description_en text,
  image_url text,
  -- Hiérarchie : null pour une famille de premier niveau.
  parent_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.categories (parent_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  reference text not null,
  name text not null,
  slug text not null unique,
  description text,
  brand text,
  image_url text,
  specs jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  order_number text not null unique,
  status text not null default 'nouvelle'
    check (status in ('nouvelle', 'en_preparation', 'expediee', 'livree', 'annulee')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  free_text_reference text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2),
  created_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  comment text,
  created_at timestamptz not null default now()
);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles (id) on delete set null,
  full_name text,
  company_name text,
  email text not null,
  phone text,
  product_id uuid references public.products (id) on delete set null,
  message text,
  status text not null default 'nouveau' check (status in ('nouveau', 'traite', 'converti')),
  created_at timestamptz not null default now()
);

-- Lignes d'une demande de devis : le panier permet de demander plusieurs
-- références en une fois. `quote_requests.product_id` reste pour les demandes
-- portant sur un seul produit (bouton « Demander un devis » d'une fiche).
create table public.quote_request_items (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  -- Référence saisie librement, pour une pièce hors catalogue.
  free_text_reference text,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index on public.products (category_id);
create index on public.quote_request_items (quote_request_id);
create index on public.orders (client_id);
create index on public.order_items (order_id);
create index on public.order_status_history (order_id);
create index on public.quote_requests (client_id);

-- ============================================================
-- Helper function: is the current user an admin?
-- security definer avoids RLS recursion when checking role from within
-- policies on the profiles table itself.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Triggers
-- ============================================================

-- Create a profile row automatically when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, company_name, contact_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'contact_name',
    new.raw_user_meta_data ->> 'phone',
    'client'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Prevent a client from promoting themselves to admin via a profile update.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_role_change();

-- Keep orders.updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Generate a human-friendly order number (CA-00001, CA-00002, ...).
create sequence if not exists public.order_number_seq start 1;

create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'CA-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger trg_set_order_number
before insert on public.orders
for each row execute function public.set_order_number();

-- Automatically log every status change (including the initial one) so the
-- client-facing timeline never gets out of sync with orders.status.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    insert into public.order_status_history (order_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger trg_log_order_status_change
after insert or update on public.orders
for each row execute function public.log_order_status_change();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_request_items enable row level security;

-- profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- categories: public read, admin write
create policy "Anyone can view categories" on public.categories
  for select using (true);
create policy "Admins manage categories" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products: public read of visible products, admin sees/manages everything
create policy "Anyone can view visible products" on public.products
  for select using (is_visible = true or public.is_admin());
create policy "Admins manage products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- orders: clients see only their own orders, admins manage all
create policy "Clients view own orders" on public.orders
  for select using (auth.uid() = client_id);
create policy "Admins manage orders" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- order_items: follow the parent order's visibility
create policy "Clients view own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid())
  );
create policy "Admins manage order items" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- order_status_history: follow the parent order's visibility
create policy "Clients view own order status history" on public.order_status_history
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid())
  );
create policy "Admins manage order status history" on public.order_status_history
  for all using (public.is_admin()) with check (public.is_admin());

-- quote_requests: anyone can submit, clients see their own, admins see/manage all
create policy "Anyone can submit a quote request" on public.quote_requests
  for insert with check (true);
create policy "Clients view own quote requests" on public.quote_requests
  for select using (auth.uid() = client_id);
create policy "Admins manage quote requests" on public.quote_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- quote_request_items : mêmes droits que la demande à laquelle elles appartiennent.
create policy "Anyone can submit quote request items" on public.quote_request_items
  for insert with check (true);
create policy "Clients view own quote request items" on public.quote_request_items
  for select using (
    exists (
      select 1 from public.quote_requests q
      where q.id = quote_request_id and q.client_id = auth.uid()
    )
  );
create policy "Admins manage quote request items" on public.quote_request_items
  for all using (public.is_admin()) with check (public.is_admin());


-- ============================================================================
-- Deuxieme partie : espace client (comptes, devis, expedition, paiements)
-- ============================================================================

-- Engcore Ltd — espace client : validation des comptes, cycle de vie du devis,
-- suivi d'expédition, encaissement.
--
-- Se joue après 0001_init.sql, sur une base déjà en place.

-- ============================================================
-- 1. Validation manuelle des comptes
-- ============================================================

alter table public.profiles
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles (id) on delete set null,
  add column if not exists rejection_reason text;

-- Les comptes créés avant cette migration n'ont jamais eu à être validés :
-- les bloquer rétroactivement enfermerait dehors des clients légitimes.
update public.profiles set status = 'approved' where created_at < now();

create index if not exists profiles_status_idx on public.profiles (status);

-- Un client ne doit pas pouvoir se valider lui-même. Le garde-fou existant ne
-- couvrait que `role` ; il couvre désormais aussi `status`, sans quoi la
-- validation manuelle ne vaudrait rien.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
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

-- Un administrateur est validé d'office : sans cela, promouvoir un compte en
-- admin le laisserait bloqué derrière l'écran d'attente.
create or replace function public.approve_admins()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' and new.status <> 'approved' then
    new.status := 'approved';
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_approve_admins on public.profiles;
create trigger trg_approve_admins
before insert or update on public.profiles
for each row execute function public.approve_admins();

-- ============================================================
-- 2. Cycle de vie du devis
-- ============================================================

-- Numéro lisible, pour les échanges par téléphone et par courrier.
create sequence if not exists public.quote_number_seq start 1;

alter table public.quote_requests
  add column if not exists reference text unique,
  add column if not exists reply_message text,
  add column if not exists currency text not null default 'GBP',
  add column if not exists shipping_amount numeric(12, 2) not null default 0
    check (shipping_amount >= 0),
  add column if not exists vat_rate numeric(5, 2) not null default 0
    check (vat_rate >= 0 and vat_rate <= 100),
  add column if not exists valid_until date,
  add column if not exists quoted_at timestamptz,
  add column if not exists responded_at timestamptz,
  add column if not exists decline_reason text;

create or replace function public.set_quote_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'DEV-' || lpad(nextval('public.quote_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_quote_reference on public.quote_requests;
create trigger trg_set_quote_reference
before insert on public.quote_requests
for each row execute function public.set_quote_reference();

-- Rattrape les demandes déjà en base.
update public.quote_requests
set reference = 'DEV-' || lpad(nextval('public.quote_number_seq')::text, 5, '0')
where reference is null;

-- « traité » ne disait pas si le client avait répondu. Le statut suit désormais
-- l'échange : reçu → chiffré → accepté ou refusé → converti en commande.
alter table public.quote_requests drop constraint if exists quote_requests_status_check;
update public.quote_requests set status = 'chiffre' where status = 'traite';
alter table public.quote_requests
  add constraint quote_requests_status_check
  check (status in ('nouveau', 'chiffre', 'accepte', 'refuse', 'converti'));

alter table public.quote_request_items
  add column if not exists unit_price numeric(12, 2) check (unit_price >= 0),
  add column if not exists label text;

-- ============================================================
-- 3. Expédition et montants de la commande
-- ============================================================

alter table public.orders
  add column if not exists quote_request_id uuid
    references public.quote_requests (id) on delete set null,
  add column if not exists currency text not null default 'GBP',
  add column if not exists shipping_amount numeric(12, 2) not null default 0
    check (shipping_amount >= 0),
  add column if not exists vat_rate numeric(5, 2) not null default 0
    check (vat_rate >= 0 and vat_rate <= 100),
  add column if not exists shipping_address text,
  add column if not exists carrier text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists shipped_at timestamptz,
  add column if not exists estimated_delivery date,
  -- Le règlement suit sa propre trajectoire : une commande peut être payée et
  -- pas encore expédiée, ou expédiée et payée par virement en attente.
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'refunded'));

create index if not exists orders_quote_request_id_idx on public.orders (quote_request_id);

-- ============================================================
-- 4. Encaissement
-- ============================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method text not null check (method in ('card', 'paypal', 'transfer')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'GBP',
  -- Référence chez le prestataire (session Stripe, ordre PayPal) ou libellé
  -- que le client doit porter sur son virement.
  provider_reference text,
  transfer_reference text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_provider_reference_idx
  on public.payments (provider_reference);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- Le statut de règlement de la commande se déduit de ses paiements : le tenir
-- à jour à la main dans trois actions différentes finirait par diverger.
create or replace function public.sync_order_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders o
  set payment_status = case
    when exists (select 1 from public.payments p
                 where p.order_id = target and p.status = 'refunded') then 'refunded'
    when exists (select 1 from public.payments p
                 where p.order_id = target and p.status = 'paid') then 'paid'
    when exists (select 1 from public.payments p
                 where p.order_id = target and p.status = 'pending') then 'pending'
    else 'unpaid'
  end
  where o.id = target;
  return null;
end;
$$;

drop trigger if exists trg_sync_order_payment_status on public.payments;
create trigger trg_sync_order_payment_status
after insert or update or delete on public.payments
for each row execute function public.sync_order_payment_status();

-- Total dû sur une commande. Une seule définition, partagée par l'affichage,
-- le contrôle des paiements et le montant envoyé au prestataire — trois
-- calculs séparés finiraient par ne plus donner la même somme.
create or replace function public.order_total(p_order uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select round(
    (
      coalesce((
        select sum(oi.quantity * coalesce(oi.unit_price, 0))
        from public.order_items oi where oi.order_id = p_order
      ), 0)
      + coalesce((select o.shipping_amount from public.orders o where o.id = p_order), 0)
    ) * (1 + coalesce((select o.vat_rate from public.orders o where o.id = p_order), 0) / 100),
    2
  );
$$;

-- ============================================================
-- 5. Sécurité
-- ============================================================

alter table public.payments enable row level security;

create policy "Clients view own payments" on public.payments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid())
  );

-- Un client déclare son intention de payer ; il ne décide jamais qu'il a payé.
-- Seuls l'administrateur et le webhook (clé de service) marquent « paid ».
create policy "Clients start own payment" on public.payments
  for insert with check (
    status = 'pending'
    and paid_at is null
    -- Le montant n'est pas au choix du payeur : il vaut le total de la commande.
    and amount = public.order_total(order_id)
    and exists (select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid())
  );

create policy "Admins manage payments" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- Le client répond à son devis. La policy seule autoriserait aussi à remettre
-- les frais de port à zéro : le trigger ci-dessous restreint la mise à jour aux
-- trois colonnes de la réponse, et aux seules transitions légitimes.
create or replace function public.restrict_quote_client_update()
returns trigger
language plpgsql
as $$
begin
  -- `accept_quote()` passe par ici pour clore le devis : elle a déjà vérifié
  -- la propriété et le statut, et court en security definer.
  if coalesce(current_setting('app.bypass_quote_guard', true), '') = 'on' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.status <> 'chiffre' or new.status not in ('accepte', 'refuse') then
    raise exception 'Ce devis n''est pas en attente de réponse.';
  end if;

  -- Tout le reste est figé sur la valeur enregistrée par l'administrateur.
  new.reference := old.reference;
  new.client_id := old.client_id;
  new.email := old.email;
  new.full_name := old.full_name;
  new.company_name := old.company_name;
  new.phone := old.phone;
  new.product_id := old.product_id;
  new.message := old.message;
  new.reply_message := old.reply_message;
  new.currency := old.currency;
  new.shipping_amount := old.shipping_amount;
  new.vat_rate := old.vat_rate;
  new.valid_until := old.valid_until;
  new.quoted_at := old.quoted_at;
  new.created_at := old.created_at;
  new.responded_at := now();
  return new;
end;
$$;

drop trigger if exists trg_restrict_quote_client_update on public.quote_requests;
create trigger trg_restrict_quote_client_update
before update on public.quote_requests
for each row execute function public.restrict_quote_client_update();

create policy "Clients respond to own quote" on public.quote_requests
  for update using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- ============================================================
-- 6. Acceptation d'un devis par le client
-- ============================================================

-- Accepter un devis crée une commande. Un client n'a pas — et ne doit pas
-- avoir — le droit d'écrire dans `orders` : sans quoi il pourrait s'inventer
-- des commandes. On passe donc par une fonction qui vérifie elle-même la
-- propriété, le statut et la validité, puis fait le travail en une transaction.
create or replace function public.accept_quote(p_quote uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quote_requests;
  v_order uuid;
begin
  select * into v_quote from public.quote_requests where id = p_quote;
  if not found then
    raise exception 'Devis introuvable.';
  end if;
  if v_quote.client_id is null or v_quote.client_id <> auth.uid() then
    raise exception 'Ce devis ne vous appartient pas.';
  end if;
  if v_quote.status <> 'chiffre' then
    raise exception 'Ce devis n''est pas en attente de réponse.';
  end if;
  if v_quote.valid_until is not null and v_quote.valid_until < current_date then
    raise exception 'Ce devis a dépassé sa date de validité.';
  end if;

  -- Un double clic ne doit pas produire deux commandes.
  select id into v_order from public.orders where quote_request_id = p_quote limit 1;
  if v_order is not null then
    return v_order;
  end if;

  insert into public.orders
    (client_id, quote_request_id, notes, currency, shipping_amount, vat_rate)
  values
    (v_quote.client_id, p_quote, v_quote.message, v_quote.currency,
     v_quote.shipping_amount, v_quote.vat_rate)
  returning id into v_order;

  insert into public.order_items
    (order_id, product_id, free_text_reference, quantity, unit_price)
  select v_order, i.product_id, coalesce(i.free_text_reference, i.label),
         i.quantity, i.unit_price
  from public.quote_request_items i
  where i.quote_request_id = p_quote;

  -- Demande portant sur une seule fiche produit, sans lignes de panier.
  if not exists (select 1 from public.quote_request_items where quote_request_id = p_quote)
     and v_quote.product_id is not null then
    insert into public.order_items (order_id, product_id, quantity)
    values (v_order, v_quote.product_id, 1);
  end if;

  perform set_config('app.bypass_quote_guard', 'on', true);
  update public.quote_requests
  set status = 'converti', responded_at = now()
  where id = p_quote;
  perform set_config('app.bypass_quote_guard', 'off', true);

  return v_order;
end;
$$;

revoke all on function public.accept_quote(uuid) from public;
grant execute on function public.accept_quote(uuid) to authenticated;

-- Le montant à payer est lu par l'application via cette fonction, pour qu'il
-- soit toujours celui que la policy d'insertion contrôlera.
grant execute on function public.order_total(uuid) to authenticated;
