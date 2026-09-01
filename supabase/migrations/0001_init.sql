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
