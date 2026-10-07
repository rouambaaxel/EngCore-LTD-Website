# Engcore Ltd

Site web pour Engcore Ltd, spécialisée dans :
- les pièces détachées pour moteur diesel d'engins miniers et de chantier (Caterpillar, Komatsu et autres),
- les pièces détachées pour engins miniers et de BTP (trains de chenille, hydraulique, freinage, transmission),
- les pompes électriques et le matériel d'instrumentation, plus généraliste (ex. ABB).

Le site est composé d'une vitrine publique (catalogue sans prix) et d'un
espace client sécurisé permettant de suivre l'état des commandes. Un
back-office minimal (`/admin`) permet de gérer le catalogue, de créer des
commandes et de traiter les demandes de devis.

## Stack technique

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (Postgres, Auth, Row Level Security)

Le paiement est en ligne : carte bancaire (Stripe), PayPal ou virement
international, une fois le devis accepté. Voir « Espace client » plus bas.

## Site bilingue (FR / EN)

Le site est servi sous `/fr` et `/en`. Un visiteur arrivant sur `/` est
redirigé selon la langue de son navigateur (repli français), et son choix est
mémorisé dans un cookie. Le sélecteur FR/EN de l'en-tête bascule vers la même
page dans l'autre langue.

Les **slugs d'URL sont identiques dans les deux langues** (`/en/catalogue`,
`/en/produits/...`) : cela évite une table de correspondance de routes pour un
gain SEO marginal, et rend le sélecteur de langue trivial.

Ce qui est traduit :

| Élément | Où |
|---|---|
| Interface, pages éditoriales | `lib/i18n/dictionaries/fr.ts` et `en.ts` |
| Pluriels et formats | `lib/i18n/format.ts` |
| Noms et descriptions de catégories | `scripts/taxonomy.mjs` (`name_en`, `description_en`) |
| Services de rénovation | `lib/reconditioning.ts` |

Les dictionnaires doivent rester des **données pures** : une fonction empêche
de passer `t` à un composant client (React ne sait pas la sérialiser). Les
formats dépendant de la langue vivent donc dans `lib/i18n/format.ts`.

`en.ts` est typé `Dictionary`, dérivé de `fr.ts` : oublier une clé lors de
l'ajout d'un libellé fait échouer la compilation.

**Les libellés produits ne sont pas traduits** : les 785 références importées
sont en anglais (descriptifs fabricant), les 35 saisies à la main en français.
C'est l'usage courant en distribution B2B. Pour les traduire, il faudrait
ajouter `name_en`/`description_en` à la table `products`.

## Espace client

Quatre mécanismes, dans l'ordre où un client les rencontre.

### 1. Validation manuelle des comptes

Une inscription ne donne pas l'accès. `profiles.status` vaut `pending` à la
création ; le proxy renvoie vers `/compte/en-attente` tant que la validation
n'est pas faite, et en ressort dès qu'elle l'est. L'administrateur valide ou
refuse depuis `/admin/comptes`, avec un motif facultatif que le client voit.

Un client ne peut pas se valider lui-même : le trigger `prevent_role_change`
remet `status`, `role`, `approved_at` et `approved_by` à leur valeur d'origine
pour tout ce qui n'est pas administrateur. Un compte promu administrateur est
validé d'office, sans quoi il resterait bloqué derrière son propre écran
d'attente.

### 2. Chiffrage et réponse au devis

Le devis suit un cycle explicite, là où l'ancien « traité » ne disait pas si le
client avait répondu :

    nouveau → chiffré → accepté ou refusé → converti

L'administrateur chiffre chaque ligne sur `/admin/devis/[id]` : prix unitaires,
port, TVA, date de validité, message. Le total se recalcule à la saisie, avec la
formule exacte que le client verra. Toutes les lignes doivent porter un prix —
un devis partiel donnerait un total faux, et c'est ce total qui sera payé.

Le client répond depuis `/compte/devis/[id]`. Accepter crée la commande.

Cette création passe par la fonction SQL `accept_quote()` en `security definer`,
pas par l'application : un client n'a — et ne doit pas avoir — aucun droit
d'écriture sur `orders`, sans quoi il pourrait s'inventer des commandes. La
fonction vérifie elle-même la propriété du devis, son statut et sa date de
validité, puis fait le travail en une transaction. Elle est idempotente : un
double clic ne produit pas deux commandes.

Le trigger `restrict_quote_client_update` borne ce qu'un client peut modifier
sur son devis. Sans lui, la policy « le client met à jour son propre devis »
l'autoriserait aussi à remettre les frais de port à zéro.

### 3. Expédition

`orders` porte transporteur, numéro et lien de suivi, date d'expédition,
livraison estimée et adresse. Renseigner un numéro de suivi bascule la commande
en « expédiée » si elle ne l'est pas déjà : coller un numéro sans changer le
statut est l'oubli le plus facile, et le plus visible côté client.

### 4. Encaissement

Trois moyens, chacun activé par ses variables d'environnement — le site
n'affiche jamais un bouton qui mènerait à une impasse :

| Moyen | Activé par | Confirmé par |
|---|---|---|
| Carte bancaire | `STRIPE_SECRET_KEY` | webhook Stripe |
| PayPal | `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` | capture au retour |
| Virement | `BANK_IBAN` + `BANK_SWIFT` | l'équipe, à réception |

Facturation en **GBP**, paiement du total en une fois.

La carte passe par Stripe Checkout : aucune donnée de carte ne transite par le
site, ce qui le tient hors du périmètre PCI. Un paiement ne devient `paid` que
par le webhook, jamais au retour du navigateur — l'utilisateur peut fermer
l'onglet ou forger l'URL de succès. La signature du webhook est vérifiée avant
tout traitement, et l'écriture passe par la clé de service, hors RLS.

PayPal se capture côté serveur au retour : sans capture, PayPal ne débite
jamais. C'est le montant renvoyé par PayPal qui est enregistré, pas celui
annoncé avant la redirection.

Le montant n'est jamais lu depuis le navigateur. `public.order_total()` le
calcule en base, et la policy d'insertion des paiements exige que le montant
déclaré lui soit égal. Un client ne peut ni choisir sa somme, ni se déclarer
payé : la policy ne l'autorise qu'à insérer une ligne `pending`.

`lib/money.ts` doit rester l'image exacte de `order_total()` : deux arrondis
divergents suffiraient à faire échouer un paiement légitime.

## Panier de demande de devis

Un visiteur peut accumuler des références avec leurs quantités, puis envoyer
l'ensemble en une seule demande de devis. Aucun prix n'apparaît : le chiffrage
est renvoyé par l'équipe.

Le panier vit dans le **navigateur** (`localStorage`, voir
`lib/cart/context.tsx`) : il fonctionne sans compte, survit aux rechargements
et au changement de langue, et se synchronise entre onglets. À l'envoi, les
slugs sont **résolus en identifiants produits côté serveur** — le contenu du
panier vient du navigateur et n'est pas digne de confiance.

En base, une demande devient une ligne `quote_requests` plus autant de lignes
`quote_request_items`. Le bouton « Demander un devis » d'une fiche produit
continue d'alimenter `quote_requests.product_id` pour une demande unitaire ;
la conversion en commande côté admin gère les deux cas.

Si l'envoi échoue, **le panier est conservé** pour que le client ne perde pas
sa sélection.

## Catalogue de démonstration

Le site est consultable **sans base de données** : tant que Supabase n'est pas
configuré, le catalogue s'appuie sur les données de démonstration de
`lib/catalogue-data.ts` (voir `lib/catalogue.ts`). Dès que Supabase est branché
et la seed exécutée, la base prend automatiquement le relais.

`lib/catalogue-data.ts` est la **source unique de vérité** de ce catalogue de
démonstration : `supabase/seed.sql` en est généré et ne doit pas être édité à la
main.

> **Ne laissez pas les valeurs d'exemple dans `.env.local`.** Un `.env.local`
> rempli avec les placeholders de `.env.local.example` fait pointer le site vers
> un domaine qui n'existe pas : chaque requête part alors en résolution DNS et
> n'échoue qu'au bout de plusieurs secondes. `lib/supabase/config.ts` détecte ce
> cas et bascule aussitôt sur le catalogue de démonstration — mais tant que
> Supabase n'est pas réellement créé, mieux vaut supprimer `.env.local`.

```bash
npm run generate:categories        # régénère l'arborescence des catégories
npm run generate:category-images   # attribue à chaque rayon un visuel produit
npm run generate:seed              # régénère supabase/seed.sql
```

Ces trois commandes s'enchaînent dans cet ordre : les images se choisissent
parmi les produits, et la seed reprend le résultat.

### Visuels des sous-catégories

Chaque sous-catégorie est illustrée par la photo d'un de ses **propres
produits**, choisie par `scripts/assign-category-images.mjs`. Auparavant, 56
rayons se partageaient 13 photos d'illustration : la même image de tuyauterie
servait à « Ventilation » comme à « Raccords & flexibles ».

L'ordre de préférence : un cliché produit avant une photo d'illustration
générique, puis le visuel le moins partagé (le plus spécifique), puis le nom le
plus court (la référence la plus représentative du rayon). Le départage final
se fait sur le slug, pour que deux exécutions donnent le même résultat.

Une **famille** puise dans sa sous-catégorie la plus fournie : sans cela,
« Appareillage électrique » était illustré par un collier de serrage plutôt que
par un disjoncteur. Le script garantit aussi qu'aucune photo ne sert deux fois.

### Visuels de la page d'accueil

Les dix cartes « Nos activités » n'utilisent **pas** `category.image_url`, mais
`lib/home-images.generated.ts`. Les deux répondent à des besoins opposés : au
catalogue, un rayon est illustré par un de ses propres produits ; en vitrine, il
faut une image qui dise le métier au premier coup d'œil. Une photo de collier de
serrage renseigne le premier cas et dessert le second.

Ce sont des **croquis techniques dessinés en SVG**, pas des photographies. Une
banque d'images libres ne donne ni la cohérence de trait ni la justesse du
sujet : sur dix rayons, il faudrait dix photographes. Ici les dix planches
sortent du même gabarit (480 × 300, papier quadrillé, contour franc et détail
léger, cotes en orange du logo), pèsent 3 Ko chacune, restent nettes à tous les
zooms et ne dépendent d'aucune licence tierce.

```bash
node scripts/draw-home-sketches.mjs   # redessine les 10 planches
```

Le script est la source unique : il écrit les SVG **et** le module TypeScript.
Pour retoucher une planche, modifier sa fonction et relancer — un chemin ne peut
donc pas pointer vers un fichier absent.

Les SVG passent par `next/image` en `unoptimized` : l'optimiseur n'a rien à
gagner sur du vectoriel, et le laisser faire imposerait d'activer
`dangerouslyAllowSVG` pour tout le site.

### Produits mis en avant

`getFeaturedProducts` (accueil) applique deux règles, pour les mêmes raisons :
elle **écarte les photos d'illustration** au profit des clichés produits, et
répartit la sélection **entre les familles** plutôt qu'entre les
sous-catégories — sinon les huit produits sortaient tous du même rayon.

### Arborescence du catalogue

`scripts/taxonomy.mjs` est la **source unique** de l'arborescence : il définit
les familles, les sous-catégories, et les règles qui classent automatiquement
les produits importés. Il alimente à la fois
`lib/catalogue-categories.generated.ts` (le site) et le classement à l'import.

L'arborescence des pièces d'engins **reprend celle de notre partenaire
FridayParts** : 9 familles et 45 sous-familles. Deux raisons à ce choix — les
acheteurs du secteur y sont déjà habitués, et le classement à l'import se
réduit à une table de correspondance (`FP_SUBFAMILY_MAP`) au lieu d'une
réinterprétation par mots-clés, donc sans risque de dérive.

L'appareillage électrique de bâtiment (Express Electrical) reste une **famille
distincte** : c'est une autre ligne de métier, avec ses propres règles de
classement.

La marque est un filtre transversal (`?marque=`) plutôt qu'un niveau
d'arborescence. Pour déplacer ou renommer une catégorie, modifier
`taxonomy.mjs` puis relancer les commandes ci-dessus.

### Import du catalogue partenaire FridayParts

8 348 références proviennent de notre partenaire FridayParts et vivent dans
`lib/catalogue-fridayparts.generated.ts` — **ne pas l'éditer à la main**. Les
prix ne sont pas repris.

**Les visuels ne sont pas repris.** Les photos du partenaire portent un
filigrane « FridayParts® » incrusté au centre de l'image. L'effacer serait une
suppression d'information de gestion des droits (CDPA s.296ZG au Royaume-Uni),
et l'afficher reviendrait à marquer notre catalogue au nom d'un tiers. Seules
les références et fiches techniques sont importées ; `cleanImageUrl()` renvoie
`null` tant que `PARTNER_IMAGES_ARE_WATERMARKED` vaut `true`.

Dès que le partenaire fournit des visuels propres, il suffit de basculer cette
constante et de relancer l'import : le reste du site est déjà prêt.

Pour réimporter :

```bash
node scripts/import-fridayparts.mjs <export.json>
npm run generate:categories
npm run generate:seed
```

L'export brut se récupère via leur endpoint public `getRecommendations`, en
balayant les identifiants de catégorie (voir l'historique du projet). Le
classement dans notre arborescence est piloté par `classifyFridayPartsProduct`
dans `scripts/taxonomy.mjs` : la **famille prime sur la feuille**, sauf pour
les deux familles fourre-tout (« Engine Spare Parts » et « Seals, Filters &
Maintenance Parts ») qui mélangent réellement plusieurs domaines.

### Import du catalogue partenaire Express Electrical

Les 785 références « Consumer Units » proviennent de notre partenaire Express
Electrical et vivent dans `lib/catalogue-consumer-units.generated.ts`, généré
automatiquement — **ne pas l'éditer à la main**. Les tarifs ne sont pas repris :
ils restent traités au devis. Les visuels sont stockés localement dans
`public/images/products/`.

Pour réimporter depuis un export à jour de l'API WooCommerce Store :

```bash
node scripts/import-consumer-units.mjs <export.json> public/images/products/_manifest.json
npm run generate:seed
```

Les descriptions sont reprises telles quelles, donc en anglais. Elles peuvent
être traduites ultérieurement sans toucher au reste du catalogue.

En revanche, l'espace client et le back-office nécessitent une vraie base
Supabase (comptes, commandes, devis).

## Mise en route

### 1. Créer un projet Supabase

1. Créer un compte et un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécuter dans l'ordre :
   - `supabase/migrations/0001_init.sql` (tables, triggers, sécurité RLS)
   - `supabase/migrations/0002_client_area.sql` (comptes, devis, expédition,
     paiements)
   - `supabase/seed.sql` (catégories et produits de démonstration)
3. Dans **Project Settings → API**, récupérer l'URL du projet et la clé
   `anon public`.

### 2. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Puis renseigner dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

`.env.local.example` liste les variables restantes (PayPal, coordonnées
bancaires) avec ce que chacune active.

### 3 bis. Brancher le webhook Stripe

Sans lui, un paiement par carte aboutit chez Stripe sans jamais être marqué
réglé sur le site.

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

La commande affiche le `whsec_...` à placer dans `STRIPE_WEBHOOK_SECRET`. En
production, créer l'endpoint dans le tableau de bord Stripe sur l'événement
`checkout.session.completed`.

### 3. Installer les dépendances et lancer le serveur

```bash
npm install
npm run dev
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000).

### 4. Créer un compte administrateur

Par défaut, tout nouveau compte créé via `/inscription` a le rôle `client`.
Pour donner les droits d'administration à un compte (accès à `/admin`),
exécuter dans le SQL Editor de Supabase :

```sql
update public.profiles set role = 'admin' where id = '<uuid-du-compte>';
```

L'UUID du compte se trouve dans **Authentication → Users**.

## Structure du projet

- `app/(public)` — vitrine (accueil, catalogue, fiche produit, contact)
- `app/(auth)` — connexion / inscription
- `app/(client)/compte` — espace client (commandes, suivi, profil)
- `app/(admin)/admin` — back-office (produits, commandes, devis)
- `lib/supabase` — clients Supabase (navigateur, serveur)
- `lib/actions` — server actions (auth, devis, profil, back-office)
- `supabase/migrations` — schéma de base de données et règles RLS

## Installer le projet sur une autre machine

Les clés ne sont pas dans le dépôt — `.env.local` en est exclu, et c'est
voulu. Elles n'ont pas à être recopiées à la main pour autant : Vercel les
détient toutes et sait les redonner.

```bash
# 1. Node.js 20 ou plus  (nodejs.org) et Git  (git-scm.com)
node -v

# 2. Le dépôt
git clone https://github.com/rouambaaxel/EngCore-LTD-Website.git
cd EngCore-LTD-Website
git checkout site-engcore

# 3. Les dépendances
npm install

# 4. Les clés, reprises du projet Vercel
npx vercel login
npx vercel link --yes --project engcore-ltd-website
npx vercel env pull .env.local --environment=development

# 5. Vérification
npx tsc --noEmit
npm run dev
```

`vercel env pull` écrit les dix-sept variables, celles du serveur comprises.
L'environnement `development` sert ici à dessein : son `NEXT_PUBLIC_SITE_URL`
vaut `http://localhost:3000`, alors que celui de production désigne le
domaine réel. Tirer les variables de production ferait pointer les liens
d'invitation et les retours de paiement du site local vers le site en ligne.

Rien d'autre à installer : la base de données et le stockage sont chez
Supabase, l'encaissement chez Stripe. Une machine neuve voit donc les mêmes
données qu'une ancienne — y compris les commandes réelles. Les migrations de
`supabase/migrations` sont déjà appliquées au projet en ligne.

## Déploiement

Hébergement visé : [Vercel](https://vercel.com/new), connecté au dépôt Git.
La base de données reste sur Supabase, qui est déjà en ligne : il n'y a pas
de base à déployer, seulement l'application.

### 1. Variables d'environnement

Les seize variables ci-dessous se règlent dans **Settings → Environment
Variables** du projet Vercel, pour les trois environnements (Production,
Preview, Development). Leurs valeurs sont celles du `.env.local` local.

| Variable | Rôle | Si elle manque |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Adresse du projet Supabase | Le site bascule sur le catalogue de démonstration |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, soumise aux politiques RLS | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé de service, **jamais** préfixée `NEXT_PUBLIC_` | Le webhook Stripe ne peut plus marquer une commande réglée |
| `NEXT_PUBLIC_SITE_URL` | Domaine public | Repli sur le domaine Vercel du projet |
| `STRIPE_SECRET_KEY` | Encaissement par carte | Le moyen « carte » n'est pas proposé |
| `STRIPE_WEBHOOK_SECRET` | Vérifie la signature des webhooks | La confirmation de paiement reste manuelle depuis le back-office |
| `FX_MARGIN_PERCENT` | Marge sur le taux de change | 5 par défaut |
| `BANK_ACCOUNT_NAME` | Titulaire commun des comptes | « Engcore Ltd » |
| `BANK_GBP_NAME` `BANK_GBP_IBAN` `BANK_GBP_SWIFT` `BANK_GBP_ADDRESS` | Compte en livres | Le virement en GBP n'est pas proposé |
| `BANK_EUR_NAME` `BANK_EUR_IBAN` `BANK_EUR_SWIFT` `BANK_EUR_ADDRESS` | Compte en euros | Le virement en EUR n'est pas proposé |

Le site n'affiche jamais un moyen de paiement qu'il ne peut pas honorer : une
variable absente retire l'option, elle ne produit pas d'erreur.

### 2. Réglages Supabase

Dans **Authentication → URL Configuration** :

- *Site URL* : le domaine de production.
- *Redirect URLs* : y ajouter le domaine de production et le domaine Vercel.

Dans **Authentication → Providers → Email**, « Confirm email » est désactivé.
C'est ce qui permet à une inscription d'ouvrir une session immédiatement, et
donc au rattachement des devis et des commandes de se faire dans la foulée.
Le réactiver demanderait de prévoir une route de confirmation.

Les migrations de `supabase/migrations` sont déjà appliquées au projet en
ligne. Pour une base neuve, les exécuter dans l'ordre, de `0001` à `0011`.

### 3. Webhook Stripe

Une fois le domaine en ligne, créer dans le tableau de bord Stripe un endpoint
vers `https://VOTRE-DOMAINE/api/webhooks/stripe`, sur l'événement
`checkout.session.completed`, puis reporter son secret dans
`STRIPE_WEBHOOK_SECRET` et redéployer.

Tant que ce secret est absent, le back-office propose une confirmation
manuelle du règlement par carte. Dès qu'il est renseigné, la confirmation
devient automatique et le bouton manuel disparaît — les deux ne coexistent
jamais, pour qu'un paiement ne puisse pas être compté deux fois.

### 4. Vérifications avant mise en ligne

- `npx tsc --noEmit` et `npm run build` passent.
- `STRIPE_SECRET_KEY` : `sk_live_` encaisse réellement, `sk_test_` non.
- Un administrateur existe (`npm run make:admin`).
