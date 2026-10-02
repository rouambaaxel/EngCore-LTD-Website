import "server-only";

/**
 * Écritures du back-office : ne jamais échouer en silence.
 *
 * Trois séances de débogage ont eu la même cause. Une écriture partait, la
 * base ne faisait rien, et l'écran se rechargeait identique — journal de
 * suivi écrit dans une table absente, import de catalogue qui ne compilait
 * pas, validation de compte écartée par une policy manquante. À chaque fois
 * le résultat de la requête était jeté sans être lu.
 *
 * Deux cas distincts, et c'est le second qui piège :
 *
 *   - `error` renseignée : la base a refusé, et le dit.
 *   - `error` nulle mais zéro ligne touchée : la base a accepté la requête
 *     et n'a trouvé personne à qui l'appliquer. C'est ce que produit une
 *     policy qui ne correspond pas — elle ne lève pas d'erreur, elle réduit
 *     l'ensemble à rien. Vu du code, c'est un succès.
 *
 * D'où `.select()` sur chaque écriture : sans lui, le second cas reste
 * indétectable.
 */

interface WriteResult {
  error: { message: string } | null;
  data: unknown[] | null;
}

/**
 * Écriture dont l'absence d'effet est une anomalie : une mise à jour visant
 * une ligne précise, une insertion. Lève, pour que l'écran le montre plutôt
 * que de laisser croire au succès.
 */
export function expectWrite(label: string, result: WriteResult): void {
  if (result.error) {
    console.error(`[admin] ${label} : ${result.error.message}`);
    throw new Error(`${label} : ${result.error.message}`);
  }
  if (!result.data || result.data.length === 0) {
    console.error(`[admin] ${label} : aucune ligne touchée`);
    throw new Error(
      `${label} : la base n'a modifié aucune ligne. ` +
        "Le plus souvent, une règle d'accès manque — voir supabase/migrations.",
    );
  }
}

/**
 * Écriture dont l'absence d'effet est acceptable : une suppression, qui n'a
 * rien à redire si la ligne était déjà partie. On trace sans interrompre —
 * faire échouer un double clic sur « supprimer » serait pénible, et sans
 * objet puisque le résultat voulu est atteint.
 */
export function logWrite(label: string, result: { error: { message: string } | null }): void {
  if (result.error) console.error(`[admin] ${label} : ${result.error.message}`);
}
