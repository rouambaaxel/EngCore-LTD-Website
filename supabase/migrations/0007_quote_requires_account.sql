-- Engcore Ltd — un devis se compose sans compte, mais ne se répond qu'avec.
--
-- Un visiteur doit pouvoir remplir son panier et décrire sa demande sans
-- barrière : lui imposer un compte avant même de savoir s'il sera servi fait
-- fuir le prospect. Mais répondre à une demande anonyme n'a pas de sens — il
-- n'y a alors ni espace où déposer le chiffrage, ni interlocuteur à qui
-- facturer, ni commande possible.
--
-- La demande est donc enregistrée telle quelle, mise en attente, et rattachée
-- au compte dès que son auteur s'inscrit. Le lien se fait par un jeton secret
-- déposé dans son navigateur, jamais par l'adresse email : celle-ci n'est pas
-- vérifiée, et laisser rattacher par email reviendrait à offrir les demandes
-- d'autrui à qui saurait deviner une adresse.
--
--   composée (anonyme) → en attente d'inscription → reçue → traitée → ...

-- ============================================================
-- 1. Nouvel état, et le jeton qui rattache
-- ============================================================

alter table public.quote_requests drop constraint if exists quote_requests_status_check;
alter table public.quote_requests
  add constraint quote_requests_status_check
  check (status in ('en_attente_compte', 'nouveau', 'chiffre', 'amende',
                    'accepte', 'refuse', 'converti'));

alter table public.quote_requests
  -- Secret tiré au sort à la composition, gardé dans un cookie httpOnly.
  -- Effacé au rattachement : il n'a plus rien à protéger une fois consommé.
  add column if not exists claim_token text;

create unique index if not exists quote_requests_claim_token_idx
  on public.quote_requests (claim_token)
  where claim_token is not null;

create index if not exists quote_requests_status_idx
  on public.quote_requests (status);

-- ============================================================
-- 2. Aucun devis sans compte ne part chez le client
-- ============================================================
--
-- La règle métier tient en une ligne, et c'est la base qui la tient : le
-- chiffrage exige un destinataire. Placée avant le retour anticipé des
-- administrateurs, elle vaut aussi pour le back-office — une manipulation
-- pressée ne peut pas la contourner.

create or replace function public.restrict_quote_client_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.bypass_quote_guard', true), '') = 'on' then
    return new;
  end if;

  if new.status = 'chiffre' and new.client_id is null then
    raise exception 'Ce devis n''est rattaché à aucun compte : son auteur doit s''inscrire pour recevoir une réponse.';
  end if;

  if public.is_admin() then
    return new;
  end if;

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
  new.claim_token := old.claim_token;
  new.responded_at := now();
  return new;
end;
$$;

-- ============================================================
-- 3. Dépôt d'une demande
-- ============================================================
--
-- L'insertion directe depuis le navigateur posait deux problèmes. Un visiteur
-- anonyme ne peut pas relire la ligne qu'il vient d'écrire — la policy de
-- lecture exige qu'il en soit le propriétaire —, si bien qu'un panier de
-- plusieurs références échouait faute de pouvoir récupérer l'identifiant de la
-- demande pour y accrocher ses lignes. Et une insertion libre laissait choisir
-- son propre statut, donc s'auto-attribuer un devis déjà accepté.
--
-- Tout passe désormais par cette fonction : elle décide seule du propriétaire
-- et du statut, résout les références du panier côté serveur, et rend le
-- numéro lisible à afficher au visiteur.

create or replace function public.submit_quote_request(
  p_email text,
  p_message text default null,
  p_full_name text default null,
  p_company_name text default null,
  p_phone text default null,
  p_product_id uuid default null,
  p_lines jsonb default '[]'::jsonb,
  p_claim_token text default null
)
returns table (quote_id uuid, quote_reference text, requires_account boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text := nullif(btrim(p_email), '');
  v_anonymous boolean := v_user is null;
  v_quote public.quote_requests;
begin
  if v_email is null then
    raise exception 'Une adresse email est nécessaire pour traiter la demande.';
  end if;

  -- Sans jeton, la demande anonyme serait irrattachable : autant la refuser
  -- tout de suite plutôt que de la laisser dormir sans issue.
  if v_anonymous and coalesce(length(p_claim_token), 0) < 16 then
    raise exception 'Jeton de rattachement manquant.';
  end if;

  insert into public.quote_requests
    (client_id, full_name, company_name, email, phone, product_id, message,
     status, claim_token)
  values
    (v_user,
     nullif(btrim(p_full_name), ''),
     nullif(btrim(p_company_name), ''),
     v_email,
     nullif(btrim(p_phone), ''),
     p_product_id,
     nullif(btrim(p_message), ''),
     case when v_anonymous then 'en_attente_compte' else 'nouveau' end,
     case when v_anonymous then p_claim_token else null end)
  returning * into v_quote;

  -- Le panier vient du navigateur : il donne des slugs, jamais des
  -- identifiants. Une référence inconnue du catalogue est conservée en clair
  -- plutôt que perdue — c'est souvent une pièce que nous ne listons pas encore.
  insert into public.quote_request_items
    (quote_request_id, product_id, free_text_reference, quantity)
  select v_quote.id,
         pr.id,
         case when pr.id is null then btrim(line.slug) else null end,
         greatest(1, least(9999, coalesce(line.quantity, 1)))
  from jsonb_to_recordset(coalesce(p_lines, '[]'::jsonb))
         as line(slug text, quantity integer)
  left join public.products pr on pr.slug = btrim(line.slug)
  where coalesce(btrim(line.slug), '') <> '';

  return query select v_quote.id, v_quote.reference, v_anonymous;
end;
$$;

grant execute on function public.submit_quote_request(
  text, text, text, text, text, uuid, jsonb, text
) to anon, authenticated;

-- L'insertion libre n'a plus de raison d'être : la fonction ci-dessus est le
-- seul chemin, et les administrateurs gardent la leur.
drop policy if exists "Anyone can submit a quote request" on public.quote_requests;
drop policy if exists "Anyone can submit quote request items" on public.quote_request_items;

-- ============================================================
-- 4. Rattachement au compte
-- ============================================================
--
-- Appelée juste après une inscription ou une connexion, avec les jetons que le
-- navigateur a conservés. Le jeton fait foi : il prouve que celui qui se
-- présente est bien celui qui a composé la demande.

create or replace function public.claim_quote_requests(p_tokens text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user is null then
    return 0;
  end if;
  if p_tokens is null or array_length(p_tokens, 1) is null then
    return 0;
  end if;
  if array_length(p_tokens, 1) > 20 then
    raise exception 'Trop de demandes à rattacher en une fois.';
  end if;

  perform set_config('app.bypass_quote_guard', 'on', true);

  update public.quote_requests
  set client_id = v_user,
      status = 'nouveau',
      claim_token = null
  where claim_token = any (p_tokens)
    and client_id is null
    and status = 'en_attente_compte';

  get diagnostics v_count = row_count;

  perform set_config('app.bypass_quote_guard', 'off', true);

  return v_count;
end;
$$;

grant execute on function public.claim_quote_requests(text[]) to authenticated;

-- ============================================================
-- 5. Les demandes anonymes déjà reçues
-- ============================================================
--
-- Elles portaient « nouveau » sans rattachement possible : le back-office les
-- présentait comme traitables alors qu'elles ne l'étaient pas. On les range
-- dans le nouvel état, qui dit la vérité. Faute de jeton, elles ne se
-- rattacheront pas toutes seules — il reste à répondre par email et à inviter
-- leur auteur à ouvrir un compte.
--
-- Le garde-fou de la section 2 refuse toute écriture hors session : on le lève
-- le temps de ce rangement, comme le fait `accept_quote()`.

select set_config('app.bypass_quote_guard', 'on', false);

update public.quote_requests
set status = 'en_attente_compte'
where client_id is null
  and status = 'nouveau';

select set_config('app.bypass_quote_guard', 'off', false);
