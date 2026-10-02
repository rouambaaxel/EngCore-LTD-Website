/**
 * Donne un nouveau mot de passe à un compte, par son email.
 *
 *   node scripts/reset-password.mjs vous@exemple.com
 *
 * Le site n'offre pas de « mot de passe oublié » : cela suppose un service
 * d'envoi d'emails, qui n'est pas raccordé. Ce script tient lieu de secours,
 * pour vous comme pour un client qui vous appelle parce qu'il n'entre plus.
 *
 * Le mot de passe est tiré au sort et écrit dans un fichier, jamais affiché à
 * l'écran : une console garde son historique, et un mot de passe lu par-dessus
 * une épaule est un mot de passe perdu.
 *
 * Passe par la clé de service, la seule qui puisse écrire dans les comptes.
 * Elle peut changer le mot de passe de n'importe qui : ce fichier mérite la
 * même prudence que la clé elle-même.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile() {
  const values = {};
  try {
    for (const line of readFileSync(join(projectRoot, ".env.local"), "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Pas de fichier : on se rabat sur l'environnement du shell.
  }
  return values;
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/**
 * Mot de passe lisible à la voix, au cas où il faudrait le dicter au
 * téléphone : ni « l » ni « 1 », ni « O » ni « 0 ».
 */
function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 20; i += 1) out += alphabet[randomInt(alphabet.length)];
  return `${out.slice(0, 5)}-${out.slice(5, 10)}-${out.slice(10, 15)}-${out.slice(15)}`;
}

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email.includes("@")) {
  fail("Usage : node scripts/reset-password.mjs vous@exemple.com");
}

const env = { ...readEnvFile(), ...process.env };
const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!url || /^https:\/\/x+\./.test(url)) {
  fail("NEXT_PUBLIC_SUPABASE_URL manquante dans .env.local.");
}
if (!serviceKey || serviceKey.startsWith("your-")) {
  fail("SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local.");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let user = null;
for (let page = 1; page <= 10 && !user; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) fail(`lecture des comptes : ${error.message}`);
  if (!data.users.length) break;
  user = data.users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
}

if (!user) fail(`Aucun compte pour ${email}.`);

const password = generatePassword();

const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
if (error) fail(`changement du mot de passe : ${error.message}`);

// Hors du dépôt : un mot de passe n'a rien à faire dans un dossier versionné,
// même ignoré par git.
const target = join(projectRoot, "..", `mot-de-passe-${email.replace(/[^a-z0-9]/g, "-")}.txt`);
writeFileSync(
  target,
  [
    `Compte   : ${email}`,
    `Nouveau  : ${password}`,
    `Changé le: ${new Date().toISOString()}`,
    "",
    "Connectez-vous avec ce mot de passe, puis changez-le depuis",
    "/fr/compte/profil — section « Mot de passe ».",
    "",
    "Supprimez ce fichier ensuite.",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`\n✓ Mot de passe changé pour ${email}`);
console.log(`  Il est écrit dans : ${target}`);
console.log("  Connectez-vous, changez-le depuis /fr/compte/profil, puis supprimez le fichier.\n");
