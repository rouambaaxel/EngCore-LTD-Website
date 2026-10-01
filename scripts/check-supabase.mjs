/** Contrôle de la configuration Supabase. N'affiche jamais les clés. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const env = {};
// Fins de ligne tolérantes : un fichier édité sous Windows porte des CRLF, et
// le « \r » résiduel empêcherait la capture de chaque valeur — le fichier
// paraîtrait vide alors qu'il est rempli.
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const mask = (v) => (v ? `${v.length} caractères, commence par « ${v.slice(0, 6)}… »` : "VIDE");

console.log("1. Valeurs présentes");
console.log("   URL     :", url ? url : "VIDE");
console.log("   anon    :", mask(anon));
console.log("   service :", mask(service));

const problems = [];
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  problems.push("L'URL doit ressembler à https://xxxxxxxx.supabase.co (sans / final, sans chemin).");
}
if (anon.length < 40) problems.push("La clé anon paraît trop courte.");
if (service.length < 40) problems.push("La clé service_role paraît trop courte.");
if (anon && service && anon === service) {
  problems.push("Les deux clés sont identiques : vous avez collé deux fois la même.");
}
if (problems.length) {
  console.log("\n✗ À corriger :");
  for (const p of problems) console.log("   -", p);
  process.exit(1);
}

console.log("\n2. Connexion avec la clé publique (anon)");
const pub = createClient(url, anon, { auth: { persistSession: false } });
const { error: pubError } = await pub.from("categories").select("id").limit(1);
console.log(pubError ? `   ✗ ${pubError.message}` : "   ✓ la base répond");

console.log("\n3. Connexion avec la clé de service");
const svc = createClient(url, service, { auth: { persistSession: false } });
const { error: svcError } = await svc.from("profiles").select("id").limit(1);
console.log(svcError ? `   ✗ ${svcError.message}` : "   ✓ accès administrateur");

console.log("\n4. Tables attendues");
for (const table of [
  "categories",
  "products",
  "profiles",
  "orders",
  "quote_requests",
  "payments",
]) {
  const { count, error } = await svc
    .from(table)
    .select("*", { count: "exact", head: true });
  console.log(
    `   ${error ? "✗" : "✓"} ${table.padEnd(16)} ${error ? error.message : `${count} ligne(s)`}`,
  );
}

console.log("\n5. Fonctions de l'espace client");
const { error: rpcError } = await svc.rpc("order_total", {
  p_order: "00000000-0000-0000-0000-000000000000",
});
console.log(
  rpcError
    ? `   ✗ order_total : ${rpcError.message}`
    : "   ✓ order_total répond (migration 0002 bien passée)",
);

// Un produit sans catégorie n'apparaît dans aucun rayon : il est invisible au
// catalogue tout en gonflant le total. C'est le défaut le plus discret d'une
// injection, et le plus long à diagnostiquer après coup.
console.log("\n6. Rattachement des produits aux rayons");
const { count: orphans } = await svc
  .from("products")
  .select("*", { count: "exact", head: true })
  .is("category_id", null);
console.log(
  orphans === 0
    ? "   ✓ aucun produit orphelin"
    : `   ✗ ${orphans} produit(s) sans catégorie — ils n'apparaîtront nulle part`,
);

const { data: roots } = await svc
  .from("categories")
  .select("id, name, slug")
  .is("parent_id", null)
  .order("name");

for (const family of roots ?? []) {
  const { data: children } = await svc
    .from("categories")
    .select("id")
    .eq("parent_id", family.id);
  const ids = [family.id, ...(children ?? []).map((c) => c.id)];
  const { count } = await svc
    .from("products")
    .select("*", { count: "exact", head: true })
    .in("category_id", ids);
  console.log(`   ${String(count).padStart(5)}  ${family.name}`);
}

// Colonnes de change : sans elles, tout règlement hors livres est rejeté par
// la policy d'insertion des paiements.
console.log("\n7. Règlement multi-devises");
const { error: fxError } = await svc
  .from("payments")
  .select("base_amount, base_currency, exchange_rate, fx_margin_rate")
  .limit(1);
console.log(
  fxError
    ? `   ✗ ${fxError.message}`
    : "   ✓ colonnes de change présentes (migration 0006 passée)",
);

const stripeKey = (env.STRIPE_SECRET_KEY ?? "").trim();
const webhook = (env.STRIPE_WEBHOOK_SECRET ?? "").trim();
console.log(
  "   " +
    (stripeKey ? "✓" : "·") +
    " Stripe        " +
    (stripeKey
      ? stripeKey.startsWith("sk_live")
        ? "clé RÉELLE — les cartes seront débitées pour de vrai"
        : "clé de test"
      : "non configuré"),
);
console.log(
  "   " +
    (webhook ? "✓" : "·") +
    " webhook       " +
    (webhook
      ? "branché — confirmation automatique"
      : "absent — confirmation manuelle depuis le back-office"),
);

for (const currency of ["GBP", "EUR", "USD"]) {
  const iban = (env[`BANK_${currency}_IBAN`] ?? "").trim();
  const swift = (env[`BANK_${currency}_SWIFT`] ?? "").trim();
  const ready = iban && swift;
  console.log(
    `   ${ready ? "✓" : "·"} virement ${currency}  ` +
      (ready ? `${iban.slice(0, 6)}… / ${swift}` : "non configuré"),
  );
}
