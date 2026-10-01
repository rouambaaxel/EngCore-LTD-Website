import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { OrderStatus } from "@/lib/types";

/**
 * Suivi public d'une commande.
 *
 * Interroge `track_order`, qui est la seule porte ouverte sans compte sur la
 * table des commandes. Ce qu'elle rend tient à l'acheminement : ni client, ni
 * adresse, ni articles, ni montants — voir la migration 0008.
 */

/** Une étape du journal, telle que la fonction SQL la sérialise. */
export interface PublicShipmentEvent {
  id: string;
  happened_at: string;
  label: string;
  location: string | null;
}

export interface OrderTracking {
  orderNumber: string;
  status: OrderStatus;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  estimatedDelivery: string | null;
  orderedAt: string;
  events: PublicShipmentEvent[];
}

interface TrackRow {
  order_number: string;
  status: string;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  estimated_delivery: string | null;
  ordered_at: string;
  events: PublicShipmentEvent[] | null;
}

const STATUSES: OrderStatus[] = [
  "nouvelle",
  "en_preparation",
  "expediee",
  "livree",
  "annulee",
];

/**
 * `null` quand le numéro ne correspond à rien — ou quand la base est
 * injoignable. Les deux se présentent de la même façon au visiteur : un
 * numéro introuvable. Distinguer les cas lui apprendrait seulement quels
 * numéros existent.
 */
export async function trackOrder(orderNumber: string): Promise<OrderTracking | null> {
  const trimmed = orderNumber.trim();
  if (!trimmed || trimmed.length > 40) return null;
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("track_order", {
      p_order_number: trimmed,
    });
    if (error || !data) return null;

    const rows = (Array.isArray(data) ? data : [data]) as TrackRow[];
    const row = rows[0];
    if (!row) return null;

    return {
      orderNumber: row.order_number,
      status: STATUSES.includes(row.status as OrderStatus)
        ? (row.status as OrderStatus)
        : "nouvelle",
      carrier: row.carrier,
      trackingNumber: row.tracking_number,
      trackingUrl: row.tracking_url,
      shippedAt: row.shipped_at,
      estimatedDelivery: row.estimated_delivery,
      orderedAt: row.ordered_at,
      events: row.events ?? [],
    };
  } catch {
    return null;
  }
}
