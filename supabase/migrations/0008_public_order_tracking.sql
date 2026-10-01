-- Engcore Ltd — suivi public d'une commande, et resserrage du rattachement.

-- ============================================================
-- 1. `claim_quote_requests` n'est plus offerte à tout venant
-- ============================================================
--
-- Postgres accorde `execute` à `public` sur toute fonction nouvellement
-- créée : le `grant` de la migration 0007 ne retirait donc rien. La fonction
-- est inoffensive hors session — elle rend 0 sans rien écrire — mais une
-- surface qui ne sert à personne n'a pas à rester ouverte.

revoke execute on function public.claim_quote_requests(text[]) from public;
revoke execute on function public.claim_quote_requests(text[]) from anon;
grant execute on function public.claim_quote_requests(text[]) to authenticated;

-- ============================================================
-- 2. Suivi d'une commande par son numéro
-- ============================================================
--
-- Un acheteur transmet souvent son numéro de commande à celui qui réceptionne
-- la marchandise — un chef de chantier, un transitaire, un collègue — qui n'a
-- pas de compte chez nous et n'a pas à en ouvrir un pour savoir où en est le
-- conteneur. C'est l'usage d'un portail transporteur : le numéro suffit.
--
-- La contrepartie est assumée : ce que cette fonction rend doit pouvoir être
-- lu par n'importe qui. Elle ne renvoie donc que l'acheminement — état,
-- transporteur, numéro de suivi, dates, journal d'étapes. Jamais le client,
-- jamais l'adresse de livraison, jamais les articles, jamais les montants.
-- Les lignes RLS des tables restent intactes : c'est cette fonction, et elle
-- seule, qui ouvre une fenêtre, et la fenêtre est étroite.

create or replace function public.track_order(p_order_number text)
returns table (
  order_number text,
  status text,
  carrier text,
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  estimated_delivery date,
  ordered_at timestamptz,
  events jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select o.order_number,
         o.status,
         o.carrier,
         o.tracking_number,
         o.tracking_url,
         o.shipped_at,
         o.estimated_delivery,
         o.created_at,
         coalesce(
           (select jsonb_agg(
                     jsonb_build_object(
                       'id', e.id,
                       'happened_at', e.happened_at,
                       'label', e.label,
                       'location', e.location)
                     order by e.happened_at desc, e.created_at desc)
            from public.shipment_events e
            where e.order_id = o.id),
           '[]'::jsonb)
  from public.orders o
  -- Saisi à la main, souvent recopié d'un courrier : la casse et les espaces
  -- superflus ne doivent pas faire échouer la recherche.
  where upper(btrim(o.order_number)) = upper(btrim(coalesce(p_order_number, '')))
    and btrim(coalesce(p_order_number, '')) <> ''
  limit 1;
$$;

grant execute on function public.track_order(text) to anon, authenticated;
