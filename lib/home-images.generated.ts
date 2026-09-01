// Généré par scripts/fetch-home-images.mjs — ne pas éditer à la main.

/**
 * Visuels de la page d'accueil, un par famille.
 *
 * Les cartes de l'accueil n'utilisent pas `category.image_url` : cette
 * colonne sert au catalogue, où chaque rayon reprend la photo d'un de ses
 * propres produits. En vitrine il faut l'inverse — une image qui dise le
 * métier au premier coup d'œil, pas une référence prise au hasard.
 *
 * Toutes sont sous CC0 / domaine public (voir public/images/home/CREDITS.md).
 */
export const HOME_IMAGES: Record<string, string> = {
  "pieces-moteur": "/images/home/pieces-moteur.jpg",
  "electricite-engin": "/images/home/electricite-engin.jpg",
  "joints-filtres-entretien": "/images/home/joints-filtres-entretien.jpg",
  "transmission-train-roulement": "/images/home/transmission-train-roulement.jpg",
  "hydraulique-pneumatique": "/images/home/hydraulique-pneumatique.jpg",
  "cabine-carrosserie": "/images/home/cabine-carrosserie.jpg",
  "climatisation-chauffage": "/images/home/climatisation-chauffage.jpg",
  "outillage-accessoires": "/images/home/outillage-accessoires.jpg",
  "machines-equipements": "/images/home/machines-equipements.jpg",
  "electrique-instrumentation": "/images/home/electrique-instrumentation.jpg",
};

export function homeImage(slug: string): string | null {
  return HOME_IMAGES[slug] ?? null;
}
