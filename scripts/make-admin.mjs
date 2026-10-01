/**
 * Donne les droits d'administrateur à un compte, par son email.
 *
 *   node scripts/make-admin.mjs vous@exemple.com
 *
 * Évite d'aller chercher un UUID dans le tableau de bord pour le recoller dans
 * l'éditeur SQL : le script retrouve le compte par son email et fait les deux
 * écritures (rôle et validation) d'un coup.
 *
 * Passe par la clé de service, la seule qui puisse modifier un rôle.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile() {
  const values = {};
  try {
    // Fins de ligne tolérantes : un fichier édité sous Windows porte des CRLF,
    // et le « \r » résiduel empêcherait la capture de chaque valeur.
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

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email.includes("@")) {
  fail("Usage : node scripts/make-admin.mjs vous@exemple.com");
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

// L'API d'administration pagine ; un négoce n'aura jamais 1 000 comptes, mais
// autant ne pas dépendre de l'ordre d'inscription.
let user = null;
for (let page = 1; page <= 10 && !user; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) fail(`lecture des comptes : ${error.message}`);
  if (!data.users.length) break;
  user = data.users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
}

if (!user) {
  fail(
    `Aucun compte pour ${email}.\n` +
      "  Créez-le d'abord sur le site : /fr/inscription",
  );
}

const { error } = await supabase
  .from("profiles")
  .update({
    role: "admin",
    status: "approved",
    approved_at: new Date().toISOString(),
  })
  .eq("id", user.id);

if (error) fail(`mise à jour du profil : ${error.message}`);

console.log(`\n✓ ${email} est administrateur et son compte est validé.`);
console.log("  Reconnectez-vous, puis ouvrez /fr/admin/comptes\n");
