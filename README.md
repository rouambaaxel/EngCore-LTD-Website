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

Il n'y a pas de paiement en ligne : les commandes sont créées et mises à
jour manuellement par l'équipe (statut, articles, prix), et le client les
consulte en lecture seule dans son espace.

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

Les dix photos sont sous **CC0 1.0 ou domaine public** (usage commercial, sans
attribution ni partage à l'identique), recadrées en 16/10 et compressées à
40–155 Ko. Sources et sujets : `public/images/home/CREDITS.md`.

```bash
node scripts/fetch-home-images.mjs   # retélécharge les 10 visuels
```

Le script est la source unique : il écrit les fichiers, `CREDITS.md` **et** le
module TypeScript. Pour changer une photo, remplacer son `url` dans le script et
relancer — un chemin ne peut donc pas pointer vers un fichier absent.

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
```

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

## Déploiement

Le projet est prêt à être déployé sur [Vercel](https://vercel.com/new) :
connecter le dépôt, renseigner les deux variables d'environnement
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, puis déployer.
