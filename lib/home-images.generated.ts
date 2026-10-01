// Généré par scripts/draw-home-sketches.mjs — ne pas éditer à la main.

/**
 * Croquis techniques de la page d'accueil, un par famille.
 *
 * Les cartes de l'accueil n'utilisent pas `category.image_url` : cette
 * colonne sert au catalogue, où chaque rayon reprend la photo d'un de ses
 * propres produits. En vitrine il faut l'inverse — une planche qui dise le
 * métier au premier coup d'œil.
 *
 * Dessins originaux : aucune licence tierce, et un trait identique d'une
 * carte à l'autre, ce qu'aucune banque d'images ne donne.
 */
export const HOME_IMAGES: Record<string, string> = {
  "pieces-moteur": "/images/home/pieces-moteur.svg",
  "electricite-engin": "/images/home/electricite-engin.svg",
  "joints-filtres-entretien": "/images/home/joints-filtres-entretien.svg",
  "transmission-train-roulement": "/images/home/transmission-train-roulement.svg",
  "hydraulique-pneumatique": "/images/home/hydraulique-pneumatique.svg",
  "cabine-carrosserie": "/images/home/cabine-carrosserie.svg",
  "climatisation-chauffage": "/images/home/climatisation-chauffage.svg",
  "outillage-accessoires": "/images/home/outillage-accessoires.svg",
  "machines-equipements": "/images/home/machines-equipements.svg",
  "electrique-instrumentation": "/images/home/electrique-instrumentation.svg",
};

export function homeImage(slug: string): string | null {
  return HOME_IMAGES[slug] ?? null;
}
