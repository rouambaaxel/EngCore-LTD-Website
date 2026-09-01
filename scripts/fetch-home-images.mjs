/**
 * Télécharge les visuels des dix familles de la page d'accueil.
 *
 * Chaque photo est sous CC0 ou dans le domaine public : réutilisable
 * commercialement, sans attribution ni partage à l'identique. Les sources sont
 * conservées dans public/images/home/CREDITS.md — l'obligation légale n'existe
 * pas, mais pouvoir retrouver l'origine d'une image des mois plus tard, si.
 *
 *   node scripts/fetch-home-images.mjs
 *
 * Les fichiers sont recadrés en 16/10 (le format des cartes) et compressés :
 * les originaux pèsent jusqu'à 20 Mo, ce qui n'a rien à faire sur un accueil.
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const UA = "EngcoreSiteBot/1.0 (catalogue illustration; contact@engcore.example)";
const OUT = path.resolve("public/images/home");
const WIDTH = 1200;
const HEIGHT = 750; // 16/10, comme l'aspect-ratio des cartes

/**
 * Une entrée par famille. `slug` correspond à la catégorie racine ; changer de
 * photo revient à changer `url` puis relancer le script.
 */
const IMAGES = [
  {
    "slug": "pieces-moteur",
    "file": "pieces-moteur.jpg",
    "subject": "Culasse, arbre à cames et chaîne de distribution",
    "url": "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA0L3Vwd2s2MjA2MjAxNC13aWtpbWVkaWEtaW1hZ2Uta293bzRvOGsuanBn.jpg",
    "license": "CC0 1.0",
    "source": "rawpixel",
    "landing": "https://www.rawpixel.com/image/3298396/free-photo-image-factory-manufacturing-bicycle"
  },
  {
    "slug": "electricite-engin",
    "file": "electricite-engin.jpg",
    "subject": "Pupitre de commande et voyants de signalisation",
    "url": "https://cdn.stocksnap.io/img-thumbs/960w/ERGESBX3H1.jpg",
    "license": "CC0 1.0",
    "source": "StockSnap",
    "landing": "https://stocksnap.io/photo/button-equipment-ERGESBX3H1"
  },
  {
    "slug": "joints-filtres-entretien",
    "file": "joints-filtres-entretien.jpg",
    "subject": "Filtre à carburant diesel avec décanteur d'eau",
    "url": "https://upload.wikimedia.org/wikipedia/commons/7/70/Manege_Station_exhibition._Diesel_bus_parts_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
    "license": "CC0 1.0",
    "source": "Wikimedia Commons",
    "landing": "https://commons.wikimedia.org/wiki/File:Manege_Station_exhibition._Diesel_bus_parts_01.jpg"
  },
  {
    "slug": "transmission-train-roulement",
    "file": "transmission-train-roulement.jpg",
    "subject": "Chaîne de transmission et joints de cardan",
    "url": "https://cdn.stocksnap.io/img-thumbs/960w/W6DBNYP27J.jpg",
    "license": "CC0 1.0",
    "source": "StockSnap",
    "landing": "https://stocksnap.io/photo/chain-machine-W6DBNYP27J"
  },
  {
    "slug": "hydraulique-pneumatique",
    "file": "hydraulique-pneumatique.jpg",
    "subject": "Tuyauterie, vannes pilotées et manomètres",
    "url": "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvZmwzNzQ5NjQ3NTc4MS1pbWFnZS1rcHFrOHVwcS5qcGc.jpg",
    "license": "CC0 1.0",
    "source": "rawpixel",
    "landing": "https://www.rawpixel.com/image/3370633/free-photo-image-hydraulic-pipes-pipeline"
  },
  {
    "slug": "cabine-carrosserie",
    "file": "cabine-carrosserie.jpg",
    "subject": "Cabine d'excavatrice : vitrage, porte, rétroviseur",
    "url": "https://upload.wikimedia.org/wikipedia/commons/7/76/Excavator_cabin.jpg",
    "license": "CC0 1.0",
    "source": "Wikimedia Commons",
    "landing": "https://commons.wikimedia.org/w/index.php?curid=151824669"
  },
  {
    "slug": "climatisation-chauffage",
    "file": "climatisation-chauffage.jpg",
    "subject": "Groupe de climatisation et de chauffage",
    "url": "https://upload.wikimedia.org/wikipedia/commons/0/01/Packaged_terminal_air_conditioner_%28white_background%29.jpg",
    "license": "CC0 1.0",
    "source": "Wikimedia Commons",
    "landing": "https://commons.wikimedia.org/w/index.php?curid=188501998"
  },
  {
    "slug": "outillage-accessoires",
    "file": "outillage-accessoires.jpg",
    "subject": "Clés, douilles et clé à molette d'atelier",
    "url": "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTMyODkzNy1pbWFnZS1rd3Z3MW1ldi5qcGc.jpg",
    "license": "CC0 1.0",
    "source": "rawpixel",
    "landing": "https://www.rawpixel.com/image/5912103/image-public-domain-blue-free"
  },
  {
    "slug": "machines-equipements",
    "file": "machines-equipements.jpg",
    "subject": "Chargeuse sur pneus sur un chantier",
    "url": "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZydHJhY3Rvcl93YXRlcl9vdXRfZmFybS1pbWFnZS1reWJhaTB4Ny5qcGc.jpg",
    "license": "CC0 1.0",
    "source": "rawpixel",
    "landing": "https://www.rawpixel.com/image/6017512/photo-image-public-domain-technology-construction"
  },
  {
    "slug": "electrique-instrumentation",
    "file": "electrique-instrumentation.jpg",
    "subject": "Rangée de disjoncteurs modulaires sur rail DIN",
    "url": "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg4MzY4NDYtaW1hZ2Uta3d2eGgwamMuanBn.jpg",
    "license": "CC0 1.0",
    "source": "rawpixel",
    "landing": "https://www.rawpixel.com/image/5921188/photo-image-public-domain-technology-free"
  }
];

await fs.mkdir(OUT, { recursive: true });

const report = [];
for (const image of IMAGES) {
  const response = await fetch(image.url, { headers: { "User-Agent": UA } });
  if (!response.ok) {
    console.error(`✗ ${image.file} — HTTP ${response.status}`);
    continue;
  }

  const original = Buffer.from(await response.arrayBuffer());
  const output = await sharp(original)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  await fs.writeFile(path.join(OUT, image.file), output);
  report.push({ ...image, bytes: output.length });
  console.log(`✓ ${image.file.padEnd(34)} ${(output.length / 1024).toFixed(0)} Ko`);
}

const credits = [
  "# Visuels de la page d'accueil",
  "",
  "Une photo par famille, choisie pour représenter le rayon plutôt que le",
  "secteur en général. Toutes sont sous **CC0 1.0** ou dans le **domaine",
  "public** : usage commercial autorisé, sans attribution ni partage à",
  "l'identique. Les sources sont listées ici pour pouvoir remonter à l'origine",
  "d'une image, pas par obligation légale.",
  "",
  "Régénérer : `node scripts/fetch-home-images.mjs`",
  "",
  "| Famille | Sujet | Licence | Source |",
  "|---|---|---|---|",
  ...report.map(
    (r) => `| \`${r.slug}\` | ${r.subject} | ${r.license} | [${r.source}](${r.landing}) |`,
  ),
  "",
].join("\n");

await fs.writeFile(path.join(OUT, "CREDITS.md"), credits, "utf8");

// Le module TypeScript est généré depuis le même manifeste : impossible qu'un
// chemin pointe vers un fichier qui n'a pas été téléchargé.
const module_ = [
  "// Généré par scripts/fetch-home-images.mjs — ne pas éditer à la main.",
  "",
  "/**",
  " * Visuels de la page d'accueil, un par famille.",
  " *",
  " * Les cartes de l'accueil n'utilisent pas `category.image_url` : cette",
  " * colonne sert au catalogue, où chaque rayon reprend la photo d'un de ses",
  " * propres produits. En vitrine il faut l'inverse — une image qui dise le",
  " * métier au premier coup d'œil, pas une référence prise au hasard.",
  " *",
  " * Toutes sont sous CC0 / domaine public (voir public/images/home/CREDITS.md).",
  " */",
  "export const HOME_IMAGES: Record<string, string> = {",
  ...report.map((r) => `  "${r.slug}": "/images/home/${r.file}",`),
  "};",
  "",
  "export function homeImage(slug: string): string | null {",
  "  return HOME_IMAGES[slug] ?? null;",
  "}",
  "",
].join("\n");

await fs.writeFile(path.resolve("lib/home-images.generated.ts"), module_, "utf8");
console.log(`\n${report.length}/${IMAGES.length} visuel(s) — ${OUT}`);
console.log("→ lib/home-images.generated.ts");
