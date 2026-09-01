/**
 * Catalogue de démonstration — source unique de vérité.
 *
 * Ces données servent à deux choses :
 *  1. Alimenter le site tant qu'aucune base Supabase n'est connectée
 *     (voir lib/catalogue.ts), afin que le catalogue soit consultable
 *     immédiatement.
 *  2. Générer `supabase/seed.sql` via `npm run generate:seed`.
 *
 * Une fois Supabase connecté et la seed exécutée, la base prend le relais et
 * ces données ne sont plus utilisées.
 */

import { CONSUMER_UNIT_PRODUCTS } from "@/lib/catalogue-consumer-units.generated";
import { FRIDAYPARTS_PRODUCTS } from "@/lib/catalogue-fridayparts.generated";

export interface CatalogueCategory {
  name: string;
  slug: string;
  description: string;
  /** `null` quand aucun cliché produit n'est disponible : la carte reste
   *  typographique plutôt que d'afficher une illustration répétée. */
  image_url: string | null;
  /** Libellés anglais ; repli sur le français s'ils sont absents. */
  name_en?: string;
  description_en?: string;
  /** Slug de la catégorie parente ; `null` pour une famille de premier niveau. */
  parent_slug?: string | null;
}

export interface CatalogueProduct {
  reference: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  specs: Record<string, string>;
  category_slug: string;
  /** Chemin local du visuel, ex. « /images/products/xxx.png ». */
  image_url?: string | null;
}

// Les catégories proviennent de la taxonomie partagée (scripts/taxonomy.mjs).
export { CATALOGUE_CATEGORIES } from "@/lib/catalogue-categories.generated";

/** Références saisies à la main (moteur diesel, engins, électrique de base). */
const CORE_PRODUCTS: CatalogueProduct[] = [
  // ---------------------------------------------------------------
  // Pièces détachées pour moteur diesel
  // ---------------------------------------------------------------
  {
    reference: "INJ-2201",
    name: "Injecteur diesel common rail",
    slug: "injecteur-diesel-common-rail",
    description:
      "Injecteur haute pression pour moteurs diesel common rail d'engins lourds, compatible principaux constructeurs.",
    brand: "Bosch",
    specs: { Type: "Injecteur common rail", "Pression d'injection": "jusqu'à 2000 bar" },
    image_url: "/images/products/diesel-injector.jpg",
    category_slug: "systeme-carburant",
  },
  {
    reference: "TURBO-3305",
    name: "Turbocompresseur reconditionné",
    slug: "turbocompresseur-reconditionne",
    description:
      "Turbocompresseur reconditionné et testé banc moteur pour moteurs diesel d'engins miniers et de chantier.",
    brand: "Garrett",
    specs: {
      Type: "Turbocompresseur à gaz d'échappement",
      État: "Reconditionné, testé banc moteur",
    },
    image_url: "/images/products/diesel-turbo.jpg",
    category_slug: "auxiliaires-moteur",
  },
  {
    reference: "FLT-1090",
    name: "Filtre à carburant diesel",
    slug: "filtre-a-carburant-diesel",
    description: "Filtre à carburant haute performance pour moteurs diesel d'engins lourds.",
    brand: "Mann Filter",
    specs: { Type: "Filtre à carburant", "Seuil de filtration": "5 microns" },
    image_url: "/images/products/diesel-filter.jpg",
    category_slug: "filtres",
  },
  {
    reference: "KIT-4410",
    name: "Kit de reconditionnement moteur diesel",
    slug: "kit-reconditionnement-moteur-diesel",
    description:
      "Kit de reconditionnement complet (joints, segments, roulements) pour moteurs diesel Caterpillar et Komatsu.",
    brand: "Caterpillar",
    specs: { Contenu: "Joints, segments, roulements", Compatibilité: "Caterpillar, Komatsu" },
    image_url: "/images/products/diesel-engine-parts.jpg",
    category_slug: "bloc-pieces-internes",
  },
  {
    reference: "TC-VTR-4120",
    name: "Turbocompresseur pour moteur diesel industriel",
    slug: "turbocompresseur-moteur-diesel-industriel",
    description: "Turbocompresseur pour moteurs diesel 4 temps industriels, forte cylindrée.",
    brand: "ABB",
    specs: {
      Type: "Turbocompresseur à gaz d'échappement",
      Compatibilité: "Wärtsilä 32, Himsen 32/40, Sulzer",
    },
    image_url: "/images/products/diesel-turbo.jpg",
    category_slug: "auxiliaires-moteur",
  },
  {
    reference: "INJ-LOR-4210",
    name: "Porte-injecteur pour moteur diesel industriel",
    slug: "porte-injecteur-moteur-diesel-industriel",
    description: "Porte-injecteur haute précision pour moteurs diesel industriels 4 temps.",
    brand: "L'Orange",
    specs: {
      Type: "Porte-injecteur",
      Compatibilité: "Wärtsilä, MAN, Pielstick",
      "Pression d'ouverture": "réglable",
    },
    image_url: "/images/products/diesel-injector.jpg",
    category_slug: "systeme-carburant",
  },
  {
    reference: "REG-WOOD-4310",
    name: "Régulateur électronique de vitesse",
    slug: "regulateur-electronique-vitesse",
    description:
      "Régulateur et actionneur électronique pour moteurs diesel industriels et groupes électrogènes.",
    brand: "Woodward",
    specs: {
      Type: "Régulateur électronique",
      Application: "Groupes électrogènes et moteurs industriels",
    },
    image_url: "/images/products/control-electronics.jpg",
    category_slug: "systemes-commande",
  },
  {
    reference: "CENT-AL-4410",
    name: "Centrifugeuse de traitement du combustible",
    slug: "centrifugeuse-traitement-combustible",
    description:
      "Centrifugeuse pour le traitement du combustible et de l'huile de moteurs diesel industriels.",
    brand: "Alfa Laval",
    specs: {
      Fonction: "Séparation huile / eau / particules",
      Application: "Combustible et huile moteur",
    },
    image_url: "/images/products/industrial-machine.jpg",
    category_slug: "filtres",
  },
  {
    reference: "ROUL-SKF-4510",
    name: "Roulement à billes pour moteur industriel",
    slug: "roulement-a-billes-moteur-industriel",
    description: "Roulement à billes de précision pour moteurs diesel industriels et auxiliaires.",
    brand: "SKF",
    specs: {
      Type: "Roulement à billes à contact oblique",
      Application: "Moteurs diesel industriels et auxiliaires",
    },
    image_url: "/images/products/bearing.jpg",
    category_slug: "bloc-pieces-internes",
  },
  {
    reference: "FLT-OIL-4610",
    name: "Filtre à huile moteur industriel",
    slug: "filtre-a-huile-moteur-industriel",
    description: "Filtre à huile plein flux pour moteurs diesel industriels et engins lourds.",
    brand: "Baldwin",
    specs: { Type: "Filtre à huile plein flux", "Seuil de filtration": "10 microns" },
    image_url: "/images/products/diesel-filter.jpg",
    category_slug: "filtres",
  },
  {
    reference: "FLT-SEP-4710",
    name: "Filtre séparateur eau/carburant",
    slug: "filtre-separateur-eau-carburant",
    description: "Filtre séparateur eau/carburant pour la protection du système d'injection.",
    brand: "Parker",
    specs: { Type: "Séparateur eau/carburant", Débit: "jusqu'à 200 L/h" },
    image_url: "/images/products/diesel-filter.jpg",
    category_slug: "filtres",
  },
  {
    reference: "DET-OIL-4810",
    name: "Détecteur de brouillard d'huile carter",
    slug: "detecteur-brouillard-huile-carter",
    description:
      "Détecteur de brouillard d'huile pour la détection anticipée de surchauffe carter moteur.",
    brand: "Schaller",
    specs: { Fonction: "Détection anticipée de surchauffe carter", Type: "Détecteur optique" },
    image_url: "/images/products/control-electronics.jpg",
    category_slug: "capteurs-indicateurs",
  },
  {
    reference: "VAN-THERM-4910",
    name: "Vanne thermostatique de régulation",
    slug: "vanne-thermostatique-de-regulation",
    description:
      "Vanne thermostatique pour la régulation de température des circuits huile et eau moteur.",
    brand: "AMOT",
    specs: { Fonction: "Régulation de température huile/eau", "Plage de température": "réglable" },
    image_url: "/images/products/industrial-valve.jpg",
    category_slug: "lubrification-refroidissement",
  },
  {
    reference: "REFR-5010",
    name: "Refroidisseur à plaques huile/eau",
    slug: "refroidisseur-a-plaques-huile-eau",
    description: "Échangeur à plaques pour le refroidissement de l'huile et de l'eau moteur.",
    brand: "GEA",
    specs: { Type: "Échangeur à plaques", Application: "Refroidissement huile et eau moteur" },
    image_url: "/images/products/heat-exchanger.jpg",
    category_slug: "lubrification-refroidissement",
  },
  {
    reference: "POMP-TR-5110",
    name: "Pompe de transfert de combustible",
    slug: "pompe-de-transfert-de-combustible",
    description: "Pompe à vis pour le transfert et l'alimentation en combustible.",
    brand: "IMO",
    specs: { Type: "Pompe à vis", Application: "Transfert et alimentation combustible" },
    image_url: "/images/products/industrial-pump.jpg",
    category_slug: "systeme-carburant",
  },

  // --- Filtres et centrifugeuses ---
  {
    reference: "CENT-MAPX-5210",
    name: "Centrifugeuse série MAPX",
    slug: "centrifugeuse-serie-mapx",
    description:
      "Centrifugeuse purificatrice/clarificatrice pour huile et combustible, série MAPX. Pièces entièrement interchangeables avec les pièces d'origine.",
    brand: "Alfa Laval",
    specs: {
      Modèles: "MAPX 204 à 313",
      Fonction: "Purificateur / clarificateur huile et combustible",
      Garantie: "6 à 18 mois",
    },
    image_url: "/images/products/industrial-machine.jpg",
    category_slug: "filtres",
  },
  {
    reference: "CENT-MAB-5220",
    name: "Centrifugeuse série MAB",
    slug: "centrifugeuse-serie-mab",
    description:
      "Centrifugeuse série MAB pour le traitement de l'huile de lubrification et du combustible.",
    brand: "Alfa Laval",
    specs: {
      Modèles: "MAB 103 à 209",
      Fonction: "Traitement huile de lubrification et combustible",
      Garantie: "6 à 18 mois",
    },
    image_url: "/images/products/industrial-machine.jpg",
    category_slug: "filtres",
  },
  {
    reference: "CENT-WHPX-5230",
    name: "Centrifugeuse série WHPX / MOPX",
    slug: "centrifugeuse-serie-whpx-mopx",
    description:
      "Centrifugeuse haute capacité séries WHPX et MOPX pour installations de forte puissance.",
    brand: "Alfa Laval",
    specs: {
      Modèles: "WHPX 405 à 513, MOPX 205 à 310",
      Fonction: "Séparation huile / eau / particules",
      Garantie: "6 à 18 mois",
    },
    image_url: "/images/products/industrial-machine.jpg",
    category_slug: "filtres",
  },
  {
    reference: "CENT-FOPX-5240",
    name: "Centrifugeuse série FOPX / MMPX / LOPX",
    slug: "centrifugeuse-serie-fopx-mmpx-lopx",
    description:
      "Centrifugeuses séries FOPX, MMPX et LOPX pour le traitement du combustible et de l'huile.",
    brand: "Alfa Laval",
    specs: {
      Modèles: "FOPX 605 à 614, MMPX 303 à 404, LOPX 705 à 714",
      Fonction: "Traitement combustible et huile",
      Garantie: "6 à 18 mois",
    },
    image_url: "/images/products/industrial-machine.jpg",
    category_slug: "filtres",
  },
  {
    reference: "CENT-MIT-5250",
    name: "Centrifugeuse Mitsubishi (séries Genius / Future / Excellent)",
    slug: "centrifugeuse-mitsubishi",
    description:
      "Centrifugeuses Mitsubishi séries Genius, Future, Excellent et Thousand pour le traitement des fluides moteur.",
    brand: "Mitsubishi",
    specs: {
      Séries: "Genius, Future, Excellent, Thousand (SJ 10 à 6000)",
      Fonction: "Traitement huile et combustible",
      Garantie: "6 à 18 mois",
    },
    image_url: "/images/products/industrial-machine.jpg",
    category_slug: "filtres",
  },
  {
    reference: "CENT-WEST-5260",
    name: "Centrifugeuse Westfalia séries OSC / OSA / OSD",
    slug: "centrifugeuse-westfalia",
    description:
      "Centrifugeuses Westfalia séries OSC, OSB, OSA et OSD, pièces interchangeables avec l'origine.",
    brand: "Westfalia",
    specs: {
      Modèles: "OSC 4 à 30, OSB 35, OSA 7 à 35, OSD 6 à 18",
      Fonction: "Séparation et clarification",
      Garantie: "6 à 18 mois",
    },
    image_url: "/images/products/industrial-machine.jpg",
    category_slug: "filtres",
  },
  {
    reference: "FLT-MOATTI-5310",
    name: "Filtre automatique Moatti",
    slug: "filtre-automatique-moatti",
    description:
      "Filtre automatique à nettoyage continu pour l'huile de lubrification des moteurs diesel.",
    brand: "Moatti",
    specs: {
      Séries: "120 à 280",
      Type: "Filtre automatique à nettoyage continu",
      Application: "Huile de lubrification",
    },
    image_url: "/images/products/diesel-filter.jpg",
    category_slug: "filtres",
  },
  {
    reference: "FLT-BOLL-5320",
    name: "Filtre Boll & Kirch simplex / duplex / automatique",
    slug: "filtre-boll-kirch",
    description:
      "Filtres Boll & Kirch en versions simplex, duplex et automatique pour circuits huile et combustible.",
    brand: "Boll & Kirch",
    specs: {
      Versions: "Simplex, duplex, automatique",
      Application: "Circuits huile et combustible",
    },
    image_url: "/images/products/diesel-filter.jpg",
    category_slug: "filtres",
  },
  {
    reference: "ECH-PLAQ-5410",
    name: "Plaques et joints d'échangeur thermique",
    slug: "plaques-et-joints-echangeur-thermique",
    description:
      "Plaques et joints de rechange pour échangeurs thermiques, toutes séries courantes.",
    brand: "Alfa Laval",
    specs: {
      Séries: "ABF, ABQ, ACD, ACE, ACF, ACG, ACP, ALA",
      Type: "Plaques et joints de rechange",
    },
    image_url: "/images/products/heat-exchanger.jpg",
    category_slug: "lubrification-refroidissement",
  },
  {
    reference: "GEN-EAU-5510",
    name: "Générateur d'eau douce",
    slug: "generateur-eau-douce",
    description: "Générateur d'eau douce par évaporation sous vide, récupération de chaleur moteur.",
    brand: "Nirex",
    specs: { Modèles: "JWP 16 à 36", Principe: "Évaporation sous vide" },
    image_url: "/images/products/industrial-pipes.jpg",
    category_slug: "consommables-entretien",
  },

  // ---------------------------------------------------------------
  // Véhicules lourds & machines minières / BTP
  // ---------------------------------------------------------------
  {
    reference: "CHEN-5210",
    name: "Kit de chaîne et galets de chenille",
    slug: "kit-chaine-galets-chenille",
    description:
      "Train de chenille complet (chaîne, galets, barbotins) pour pelles et bulldozers Caterpillar et Komatsu.",
    brand: "Komatsu",
    specs: {
      Contenu: "Chaîne, galets, barbotins",
      Compatibilité: "Pelles et bulldozers Caterpillar, Komatsu",
    },
    category_slug: "train-chenille",
  },
  {
    reference: "HYD-5502",
    name: "Vérin hydraulique de godet",
    slug: "verin-hydraulique-godet",
    description: "Vérin hydraulique renforcé pour engins de terrassement et pelles minières.",
    brand: "Caterpillar",
    specs: { Type: "Vérin hydraulique double effet", Application: "Terrassement et pelles minières" },
    category_slug: "verins-composants",
  },
  {
    reference: "FRN-6103",
    name: "Kit de freinage pour engin lourd",
    slug: "kit-freinage-engin-lourd",
    description:
      "Kit de freinage renforcé pour tombereaux et chargeuses utilisés en mine et carrière.",
    brand: "Komatsu",
    specs: { Application: "Tombereaux et chargeuses", Usage: "Mine et carrière" },
    category_slug: "freinage",
  },
  {
    reference: "TRSM-6210",
    name: "Kit de transmission powershift",
    slug: "kit-transmission-powershift",
    description:
      "Composants de transmission powershift pour chargeuses et bulldozers d'exploitation minière.",
    brand: "Caterpillar",
    specs: { Type: "Transmission powershift", Application: "Chargeuses et bulldozers" },
    category_slug: "organes-transmission",
  },
  {
    reference: "EMB-6310",
    name: "Kit d'embrayage pour véhicule lourd",
    slug: "kit-embrayage-vehicule-lourd",
    description:
      "Kit d'embrayage complet pour camions et véhicules lourds, forte capacité de couple.",
    brand: "Sachs",
    specs: { Contenu: "Disque, mécanisme, butée", Capacité: "Forte capacité de couple" },
    category_slug: "organes-transmission",
  },

  // ---------------------------------------------------------------
  // Articles électriques & instrumentation
  // ---------------------------------------------------------------
  {
    reference: "DISJ-8010",
    name: "Disjoncteur industriel modulaire",
    slug: "disjoncteur-industriel-modulaire",
    description:
      "Disjoncteur modulaire pour tableaux électriques industriels, plusieurs calibres disponibles.",
    brand: "ABB",
    specs: { Type: "Disjoncteur modulaire", Calibres: "Plusieurs calibres disponibles" },
    category_slug: "disjoncteurs-mcb",
  },
  {
    reference: "CABL-8110",
    name: "Câble électrique industriel",
    slug: "cable-electrique-industriel",
    description:
      "Câble électrique multiconducteur pour installations industrielles et de chantier.",
    brand: "Nexans",
    specs: { Type: "Multiconducteur", Application: "Installations industrielles et de chantier" },
    category_slug: "accessoires-raccordement",
  },
  {
    reference: "POMP-7000",
    name: "Pompe électrique centrifuge",
    slug: "pompe-electrique-centrifuge",
    description: "Pompe électrique centrifuge industrielle pour applications de process.",
    brand: "ABB",
    specs: { Type: "Pompe centrifuge", Application: "Process industriel" },
    category_slug: "instrumentation-mesure",
  },
  {
    reference: "INST-7200",
    name: "Transmetteur de pression",
    slug: "transmetteur-de-pression",
    description: "Transmetteur de pression pour instrumentation industrielle de précision.",
    brand: "ABB",
    specs: { Type: "Transmetteur de pression", Usage: "Instrumentation de précision" },
    category_slug: "instrumentation-mesure",
  },
  {
    reference: "VFD-7350",
    name: "Variateur de vitesse électronique",
    slug: "variateur-de-vitesse-electronique",
    description:
      "Variateur de vitesse (VFD) pour le pilotage de moteurs et pompes électriques.",
    brand: "ABB",
    specs: { Type: "Variateur de fréquence (VFD)", Application: "Moteurs et pompes électriques" },
    category_slug: "instrumentation-mesure",
  },
];

export const CATALOGUE_PRODUCTS: CatalogueProduct[] = [
  ...CORE_PRODUCTS,
  ...CONSUMER_UNIT_PRODUCTS,
  ...FRIDAYPARTS_PRODUCTS,
];
