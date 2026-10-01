-- Engcore Ltd — négociation d'un devis.
--
-- Un devis se discutait en un seul coup : chiffré, puis accepté ou refusé. En
-- négoce de pièces, l'échange va rarement aussi vite — le client demande une
-- remise, un autre incoterm, un délai. Il faut donc pouvoir renvoyer une
-- version corrigée, autant de fois que nécessaire, sans perdre le fil.
--
--   reçu → traité → (amendement demandé → traité)* → accepté → converti
--                 └→ refusé

-- ============================================================
-- 1. Nouvel état : le client demande une révision
-- ============================================================

alter table public.quote_requests drop constraint if exists quote_requests_status_check;
alter table public.quote_requests
  add constraint quote_requests_status_check
  check (status in ('nouveau', 'chiffre', 'amende', 'accepte', 'refuse', 'converti'));

alter table public.quote_requests
  -- Numéro de version, incrémenté à chaque envoi : « DEV-00007 v3 » situe
  -- immédiatement une discussion reprise après plusieurs jours.
  add column if not exists revision integer not null default 1;

-- ============================================================
-- 2. Le fil de discussion
-- ============================================================

create table if not exists public.quote_messages (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete cascade,
  author text not null check (author in ('client', 'admin')),
  body text not null check (length(trim(body)) > 0),
  -- Version du devis au moment du message, pour relire l'échange dans l'ordre.
  revision integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists quote_messages_quote_idx
  on public.quote_messages (quote_request_id, created_at);

alter table public.quote_messages enable row level security;

create policy "Clients read own quote messages" on public.quote_messages
  for select using (
    exists (
      select 1 from public.quote_requests q
      where q.id = quote_request_id and q.client_id = auth.uid()
    )
  );

-- Un client écrit en son nom, jamais au nom de l'équipe.
create policy "Clients write own quote messages" on public.quote_messages
  for insert with check (
    author = 'client'
    and exists (
      select 1 from public.quote_requests q
      where q.id = quote_request_id and q.client_id = auth.uid()
    )
  );

create policy "Admins manage quote messages" on public.quote_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 3. Le client peut désormais demander une révision
-- ============================================================

create or replace function public.restrict_quote_client_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.bypass_quote_guard', true), '') = 'on' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- « amende » rejoint « accepte » et « refuse » : trois réponses possibles à
  -- un devis reçu, et toujours depuis le seul état qui les attend.
  if old.status <> 'chiffre' or new.status not in ('accepte', 'refuse', 'amende') then
    raise exception 'Ce devis n''est pas en attente de réponse.';
  end if;

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
  new.revision := old.revision;
  new.responded_at := now();
  return new;
end;
$$;

-- ============================================================
-- 4. Correction d'encodage
-- ============================================================
--
-- Les migrations precedentes ont ete collees depuis un presse-papiers lu en
-- ANSI : les accents de leurs messages d'erreur sont arrives abimes en base.
-- Ces messages remontent jusqu'au client (« Ce devis a depasse sa date de
-- validite »), il faut donc les reecrire. Recreer la fonction suffit : son
-- corps est remplace, rien d'autre n'est touche.

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
