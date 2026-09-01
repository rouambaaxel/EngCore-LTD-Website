export type UserRole = "client" | "admin";

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
  client_id: string;
  order_number: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  status: "nouveau" | "traite" | "converti";
  created_at: string;
  product?: Product | null;
  /** Lignes du panier, quand la demande porte sur plusieurs références. */
  items?: QuoteRequestItem[];
}
