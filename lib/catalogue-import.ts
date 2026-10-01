import "server-only";
import ExcelJS from "exceljs";

/**
 * Lecture d'un tarif fournisseur.
 *
 * Un fournisseur envoie ce qu'il a sous la main : un Excel, un CSV séparé par
 * des points-virgules, des en-têtes en français ou en anglais, parfois en
 * majuscules. Plutôt que d'imposer un gabarit rigide, on reconnaît les
 * intitulés usuels et on ignore les colonnes inconnues.
 */

export interface ImportRow {
  reference: string;
  name: string;
  category: string | null;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  visible: boolean;
  /** Ligne dans le fichier, pour désigner précisément une erreur. */
  line: number;
}

export interface ParseResult {
  rows: ImportRow[];
  /** Colonnes reconnues, pour que l'utilisateur vérifie la correspondance. */
  recognised: Record<string, string>;
  /** Intitulés présents mais non exploités. */
  ignored: string[];
  errors: string[];
}

/** Intitulés acceptés pour chaque champ, en français comme en anglais. */
const HEADERS: Record<keyof Omit<ImportRow, "line">, string[]> = {
  reference: ["reference", "référence", "ref", "réf", "part number", "partnumber", "code"],
  name: ["name", "nom", "designation", "désignation", "libelle", "libellé", "produit", "product"],
  category: ["category", "catégorie", "categorie", "rayon", "famille"],
  brand: ["brand", "marque", "fabricant", "manufacturer"],
  description: ["description", "descriptif", "détail", "detail"],
  imageUrl: ["image", "image_url", "photo", "url image", "lien image"],
  visible: ["visible", "visibilité", "visibilite", "actif", "published"],
};

/** Ramène un intitulé à sa forme comparable : sans accent, sans ponctuation. */
function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const FIELD_BY_HEADER = new Map<string, keyof Omit<ImportRow, "line">>();
for (const [field, aliases] of Object.entries(HEADERS)) {
  for (const alias of aliases) {
    FIELD_BY_HEADER.set(normalise(alias), field as keyof Omit<ImportRow, "line">);
  }
}

/** « non », « 0 », « false » valent faux ; tout le reste vaut vrai. */
function toBoolean(raw: string): boolean {
  const value = normalise(raw);
  return !["non", "no", "0", "false", "faux", "n"].includes(value);
}

/**
 * Découpe une ligne CSV en respectant les guillemets.
 *
 * Une désignation contient souvent une virgule — « Joint, culasse, Deutz » —
 * qu'un simple `split` couperait en trois colonnes.
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/** Excel français écrit en point-virgule ; l'anglais en virgule. */
function detectDelimiter(headerLine: string): string {
  const counts = [";", ",", "\t"].map((d) => [d, headerLine.split(d).length] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 1 ? counts[0][0] : ";";
}

function readCsv(buffer: Buffer): string[][] {
  // Le BOM d'Excel collerait un caractère invisible au premier intitulé.
  const text = buffer.toString("utf8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => splitCsvLine(line, delimiter));
}

async function readSpreadsheet(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const grid: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    // `values` est décalé d'un cran : l'index 0 n'est pas utilisé par ExcelJS.
    const values = row.values as unknown[];
    for (let i = 1; i < values.length; i += 1) {
      const value = values[i];
      cells.push(value === null || value === undefined ? "" : String(value).trim());
    }
    grid.push(cells);
  });
  return grid;
}

export async function parseCatalogueFile(
  fileName: string,
  buffer: Buffer,
): Promise<ParseResult> {
  const errors: string[] = [];
  const isSpreadsheet = /\.xlsx?$/i.test(fileName);

  let grid: string[][];
  try {
    grid = isSpreadsheet ? await readSpreadsheet(buffer) : readCsv(buffer);
  } catch {
    return {
      rows: [],
      recognised: {},
      ignored: [],
      errors: ["Fichier illisible. Attendu : .csv, .xlsx ou .xls."],
    };
  }

  if (grid.length < 2) {
    return {
      rows: [],
      recognised: {},
      ignored: [],
      errors: ["Le fichier ne contient aucune ligne de données sous ses intitulés."],
    };
  }

  const header = grid[0];
  const columnField = new Map<number, keyof Omit<ImportRow, "line">>();
  const recognised: Record<string, string> = {};
  const ignored: string[] = [];

  header.forEach((label, index) => {
    const field = FIELD_BY_HEADER.get(normalise(label));
    if (field) {
      columnField.set(index, field);
      recognised[label] = field;
    } else if (label.trim() !== "") {
      ignored.push(label);
    }
  });

  if (![...columnField.values()].includes("reference")) {
    errors.push("Colonne « Référence » introuvable : c'est elle qui identifie chaque pièce.");
  }
  if (![...columnField.values()].includes("name")) {
    errors.push("Colonne « Désignation » introuvable.");
  }
  if (errors.length > 0) return { rows: [], recognised, ignored, errors };

  const rows: ImportRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < grid.length; i += 1) {
    const cells = grid[i];
    const value = (field: keyof Omit<ImportRow, "line">): string => {
      for (const [index, name] of columnField) {
        if (name === field) return (cells[index] ?? "").trim();
      }
      return "";
    };

    const reference = value("reference");
    const name = value("name");
    if (!reference && !name) continue; // ligne vide au milieu du fichier

    const line = i + 1;
    if (!reference) {
      errors.push(`Ligne ${line} : référence manquante.`);
      continue;
    }
    if (!name) {
      errors.push(`Ligne ${line} : désignation manquante pour ${reference}.`);
      continue;
    }

    const key = reference.toLowerCase();
    if (seen.has(key)) {
      errors.push(`Ligne ${line} : référence ${reference} présente plusieurs fois.`);
      continue;
    }
    seen.add(key);

    const visibleRaw = value("visible");
    rows.push({
      reference,
      name,
      category: value("category") || null,
      brand: value("brand") || null,
      description: value("description") || null,
      imageUrl: value("imageUrl") || null,
      visible: visibleRaw === "" ? true : toBoolean(visibleRaw),
      line,
    });
  }

  return { rows, recognised, ignored, errors };
}

/** Identifiant d'URL dérivé d'une référence, stable et lisible. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
