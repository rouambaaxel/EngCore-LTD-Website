-- Engcore Ltd — journal de suivi d'expédition.
--
-- Le suivi ne se résume pas à un numéro chez un transporteur : en fret et en
-- groupage vers l'Afrique, l'acheminement passe par un transitaire, un port,
-- un dédouanement, une livraison finale — autant d'étapes qu'aucun portail
-- public ne rassemble. L'équipe les saisit au fil de l'eau ; le client lit la
-- chronologie complète depuis son espace.

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Date de l'événement, pas de la saisie : une étape se renseigne souvent
  -- le lendemain, et c'est la date réelle qui intéresse le client.
  happened_at timestamptz not null default now(),
  label text not null check (length(trim(label)) > 0),
  location text,
  created_at timestamptz not null default now()
);

create index if not exists shipment_events_order_idx
  on public.shipment_events (order_id, happened_at desc);

alter table public.shipment_events enable row level security;

-- Le client lit le suivi de ses propres commandes, et rien d'autre.
create policy "Clients view own shipment events" on public.shipment_events
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = auth.uid()
    )
  );

create policy "Admins manage shipment events" on public.shipment_events
  for all using (public.is_admin()) with check (public.is_admin());
