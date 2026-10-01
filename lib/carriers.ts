/**
 * Transporteurs et construction du lien de suivi.
 *
 * L'administrateur choisissait un transporteur en texte libre et devait coller
 * lui-même l'URL de suivi. Deux occasions de se tromper, pour une information
 * que le numéro suffit à déduire. Ici le lien se déduit du couple
 * transporteur + numéro ; l'URL saisie à la main reste possible et prime,
 * pour les cas qu'aucun gabarit ne couvre.
 *
 * Si un transporteur modifie son site, seule la ligne `template` change.
 * `{n}` y est remplacé par le numéro de suivi.
 */

export interface Carrier {
  id: string;
  label: string;
  /** Gabarit d'URL ; `{n}` reçoit le numéro de suivi. */
  template: string | null;
}

/**
 * Sélection resserrée sur le métier : expédition depuis Londres vers
 * l'Afrique et l'Europe, colis express comme fret maritime conteneurisé.
 */
export const CARRIERS: Carrier[] = [
  // Express international
  { id: "dhl", label: "DHL Express", template: "https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id={n}" },
  { id: "fedex", label: "FedEx", template: "https://www.fedex.com/fedextrack/?trknbr={n}" },
  { id: "ups", label: "UPS", template: "https://www.ups.com/track?tracknum={n}" },
  { id: "tnt", label: "TNT", template: "https://www.tnt.com/express/en_gb/site/shipping-tools/tracking.html?searchType=con&cons={n}" },
  { id: "dpd", label: "DPD", template: "https://track.dpd.co.uk/search?reference={n}" },
  { id: "gls", label: "GLS", template: "https://gls-group.com/GROUP/en/parcel-tracking?match={n}" },

  // Royaume-Uni
  { id: "royalmail", label: "Royal Mail", template: "https://www.royalmail.com/track-your-item#/tracking-results/{n}" },
  { id: "parcelforce", label: "Parcelforce", template: "https://www.parcelforce.com/track-trace?trackNumber={n}" },

  // France et zone euro
  { id: "chronopost", label: "Chronopost", template: "https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT={n}" },
  { id: "colissimo", label: "Colissimo / La Poste", template: "https://www.laposte.fr/outils/suivre-vos-envois?code={n}" },

  // Fret maritime : suivi par numéro de conteneur ou de connaissement
  { id: "maersk", label: "Maersk (maritime)", template: "https://www.maersk.com/tracking/{n}" },
  { id: "cmacgm", label: "CMA CGM (maritime)", template: "https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference={n}" },
  { id: "msc", label: "MSC (maritime)", template: "https://www.msc.com/en/track-a-shipment?trackingNumber={n}" },

  // Aérien / groupage sans portail public exploitable
  { id: "air-freight", label: "Fret aérien (LTA)", template: null },
  { id: "other", label: "Autre transporteur", template: null },
];

const byId = new Map(CARRIERS.map((carrier) => [carrier.id, carrier]));

export function findCarrier(id: string | null): Carrier | null {
  return id ? (byId.get(id) ?? null) : null;
}

/** Libellé affichable : le nom du transporteur connu, sinon la valeur brute. */
export function carrierLabel(id: string | null): string | null {
  if (!id) return null;
  return byId.get(id)?.label ?? id;
}

/**
 * Lien de suivi.
 *
 * L'URL explicite de l'administrateur a toujours raison : elle couvre les
 * transporteurs régionaux et les portails de groupage. À défaut, on construit
 * le lien depuis le gabarit du transporteur.
 */
export function trackingUrl(
  carrierId: string | null,
  trackingNumber: string | null,
  explicitUrl: string | null,
): string | null {
  if (explicitUrl && /^https?:\/\//i.test(explicitUrl)) return explicitUrl;

  const carrier = findCarrier(carrierId);
  const number = (trackingNumber ?? "").trim();
  if (!carrier?.template || !number) return null;

  return carrier.template.replace("{n}", encodeURIComponent(number));
}
