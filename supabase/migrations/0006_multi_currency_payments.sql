-- Engcore Ltd — règlement en plusieurs devises.
--
-- Le devis reste établi en livres : c'est la monnaie de la société et de sa
-- comptabilité. Le client peut en revanche régler en euro ou en dollar, au
-- taux du jour majoré d'une marge de change.
--
-- Une ligne de paiement porte donc deux montants :
--   base_amount  — ce qui est dû, en GBP, et qui seul fait foi
--   amount       — ce qui est réellement encaissé, dans `currency`
--
-- Conserver le taux appliqué rend l'écart vérifiable des mois plus tard, sans
-- avoir à retrouver le cours d'un jour précis.

alter table public.payments
  add column if not exists base_amount numeric(12, 2),
  add column if not exists base_currency text not null default 'GBP',
  -- 1 GBP = `exchange_rate` unités de `currency`, marge comprise.
  add column if not exists exchange_rate numeric(18, 8),
  add column if not exists fx_margin_rate numeric(5, 2) not null default 0;

-- Les paiements antérieurs étaient tous en livres.
update public.payments
set base_amount = amount, exchange_rate = 1, fx_margin_rate = 0
where base_amount is null;

alter table public.payments alter column base_amount set not null;

alter table public.payments drop constraint if exists payments_currency_check;
alter table public.payments
  add constraint payments_currency_check check (currency in ('GBP', 'EUR', 'USD'));

-- ============================================================
-- Contrôle du montant
-- ============================================================
--
-- La policy vérifiait `amount = order_total()`. Elle bloquerait désormais tout
-- règlement hors livres, le montant encaissé étant converti. C'est le montant
-- de base qui doit correspondre : le client ne choisit ni ce qu'il doit, ni le
-- taux, seulement la devise dans laquelle il s'acquitte.

drop policy if exists "Clients start own payment" on public.payments;

create policy "Clients start own payment" on public.payments
  for insert with check (
    status = 'pending'
    and paid_at is null
    and base_amount = public.order_total(order_id)
    and amount > 0
    and exchange_rate > 0
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = auth.uid()
    )
  );
