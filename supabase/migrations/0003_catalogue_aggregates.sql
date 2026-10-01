-- Engcore Ltd — agrégats du catalogue.
--
-- PostgREST plafonne toute requête à 1 000 lignes. Compter les références en
-- rapatriant une ligne par produit donnait donc 1 000 au lieu de 9 168 : tous
-- les totaux affichés au catalogue étaient faux, et la page Marques n'en
-- voyait qu'un neuvième.
--
-- Agréger côté base résout le fond du problème : une ligne par catégorie au
-- lieu d'une par produit, et un seul aller-retour.

create or replace function public.product_counts()
returns table (category_id uuid, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.category_id, count(*)::bigint
  from public.products p
  where p.is_visible = true and p.category_id is not null
  group by p.category_id;
$$;

create or replace function public.brand_counts()
returns table (brand text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select trim(p.brand), count(*)::bigint
  from public.products p
  where p.is_visible = true and coalesce(trim(p.brand), '') <> ''
  group by trim(p.brand)
  order by count(*) desc, trim(p.brand);
$$;

-- Le catalogue est public : la vitrine interroge ces fonctions sans session.
grant execute on function public.product_counts() to anon, authenticated;
grant execute on function public.brand_counts() to anon, authenticated;
