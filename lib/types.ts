export type UserRole = "client" | "admin";

/** Un compte n'accède à l'espace client qu'une fois validé à la main. */
export type AccountStatus = "pending" | "approved" | "rejected";

/**
 * Cycle de vie d'un devis : reçu, chiffré et envoyé, puis accepté ou refusé
 * par le client, enfin converti en commande.
 */
export type QuoteStatus =
  /** Composé sans compte : la réponse attend l'inscription de son auteur. */
  | "en_attente_compte"
  | "nouveau"
  /** Traité et envoyé au client : le seul état qui attend sa réponse. */
  | "chiffre"
  /** Le client a demandé une révision ; la balle est dans notre camp. */
  | "amende"
  | "accepte"
  | "refuse"
  | "converti";

/** Un échange du fil de négociation attaché à un devis. */
export interface QuoteMessage {
  id: string;
  quote_request_id: string;
  author: "client" | "admin";
  body: string;
  revision: number;
  created_at: string;
}

/** Le règlement suit sa propre trajectoire, distincte de l'expédition. */
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";

export type PaymentMethod = "card" | "transfer";

export type PaymentState =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type OrderStatus =
  | "nouvelle"
  | "en_preparation"
  | "expediee"
  | "livree"
  | "annulee";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  nouvelle: "Nouvelle",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  "nouvelle",
  "en_preparation",
  "expediee",
  "livree",
];

export interface Profile {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  status: AccountStatus;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  /** Libellés anglais ; repli sur le français s'ils sont absents. */
  name_en: string | null;
  description_en: string | null;
  /** Catégorie parente ; `null` pour une famille de premier niveau. */
  parent_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  reference: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  image_url: string | null;
  specs: Record<string, string>;
  is_visible: boolean;
  created_at: string;
  category?: Category | null;
}

export interface Order {
  id: string;
  /**
   * `null` pour une commande saisie au nom d'un destinataire sans compte.
   * Elle le rejoindra s'il en ouvre un par invitation.
   */
  client_id: string | null;
  /** Coordonnées du destinataire tant qu'il n'a pas de compte. */
  guest_email: string | null;
  guest_name: string | null;
  guest_company: string | null;
  guest_phone: string | null;
  order_number: string;
  status: OrderStatus;
  notes: string | null;
  quote_request_id: string | null;
  currency: string;
  shipping_amount: number;
  vat_rate: number;
  shipping_address: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  estimated_delivery: string | null;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

/** Une étape d'acheminement, saisie par l'équipe. */
export interface ShipmentEvent {
  id: string;
  order_id: string;
  /** Date de l'événement, distincte de la date de saisie. */
  happened_at: string;
  label: string;
  location: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentState;
  /** Montant réellement encaissé, dans `currency`. */
  amount: number;
  currency: string;
  /** Ce qui est dû, en devise de facturation — seul montant qui fait foi. */
  base_amount: number;
  base_currency: string;
  /** 1 unité de base = `exchange_rate` unités de `currency`, marge comprise. */
  exchange_rate: number | null;
  fx_margin_rate: number;
  /** Identifiant chez le prestataire (session Stripe, ordre PayPal). */
  provider_reference: string | null;
  /** Libellé que le client doit porter sur son virement. */
  transfer_reference: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  free_text_reference: string | null;
  quantity: number;
  unit_price: number | null;
  created_at: string;
  product?: Product | null;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  status: OrderStatus;
  comment: string | null;
  created_at: string;
}

export interface QuoteRequestItem {
  id: string;
  quote_request_id: string;
  product_id: string | null;
  free_text_reference: string | null;
  quantity: number;
  /** Renseigné par l'administrateur au moment du chiffrage. */
  unit_price: number | null;
  /** Libellé donné à une ligne hors catalogue. */
  label: string | null;
  created_at: string;
  product?: Product | null;
}

export interface QuoteRequest {
  id: string;
  client_id: string | null;
  full_name: string | null;
  company_name: string | null;
  email: string;
  phone: string | null;
  product_id: string | null;
  message: string | null;
  status: QuoteStatus;
  /** Numéro lisible (DEV-00001), pour les échanges avec le client. */
  reference: string | null;
  /** Mot de l'équipe accompagnant le chiffrage. */
  reply_message: string | null;
  currency: string;
  shipping_amount: number;
  vat_rate: number;
  valid_until: string | null;
  /** Version du devis, incrémentée à chaque envoi. */
  revision: number;
  quoted_at: string | null;
  responded_at: string | null;
  decline_reason: string | null;
  created_at: string;
  product?: Product | null;
  /** Lignes du panier, quand la demande porte sur plusieurs références. */
  items?: QuoteRequestItem[];
}
