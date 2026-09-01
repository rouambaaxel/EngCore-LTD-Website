"use client";

/**
 * Panier de demande de devis.
 *
 * Il vit dans le navigateur (localStorage) : un visiteur peut donc constituer
 * sa demande sans compte, et le panier survit à un rechargement. On y stocke un
 * instantané du produit (nom, référence, visuel) afin d'afficher le panier sans
 * requête serveur ; seul le `slug` sert d'identifiant côté envoi.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "engcore.quote-cart.v1";
const MAX_QUANTITY = 9999;

export interface CartLine {
  slug: string;
  reference: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  /** Nombre de références distinctes ; 0 tant que l'hydratation n'a pas eu lieu. */
  count: number;
  /** Faux pendant le rendu serveur et la première passe client. */
  ready: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function parseStored(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // On filtre défensivement : le contenu vient du navigateur de l'utilisateur.
    return parsed.flatMap((item): CartLine[] => {
      if (!item || typeof item.slug !== "string" || typeof item.name !== "string") {
        return [];
      }
      const quantity = Number(item.quantity);
      return [
        {
          slug: item.slug,
          reference: typeof item.reference === "string" ? item.reference : "",
          name: item.name,
          brand: typeof item.brand === "string" ? item.brand : null,
          imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
          quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Lecture après montage : le serveur ne connaît pas localStorage, lire
  // pendant le rendu provoquerait une divergence d'hydratation.
  useEffect(() => {
    setLines(parseStored(window.localStorage.getItem(STORAGE_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  // Garde les onglets ouverts en phase.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLines(parseStored(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback<CartContextValue["add"]>((line, quantity = 1) => {
    const wanted = Math.max(1, Math.floor(quantity));
    setLines((current) => {
      const existing = current.find((item) => item.slug === line.slug);
      if (existing) {
        return current.map((item) =>
          item.slug === line.slug
            ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + wanted) }
            : item,
        );
      }
      return [...current, { ...line, quantity: Math.min(MAX_QUANTITY, wanted) }];
    });
  }, []);

  const setQuantity = useCallback<CartContextValue["setQuantity"]>((slug, quantity) => {
    const wanted = Math.floor(quantity);
    setLines((current) =>
      wanted < 1
        ? current.filter((item) => item.slug !== slug)
        : current.map((item) =>
            item.slug === slug
              ? { ...item, quantity: Math.min(MAX_QUANTITY, wanted) }
              : item,
          ),
    );
  }, []);

  const remove = useCallback<CartContextValue["remove"]>((slug) => {
    setLines((current) => current.filter((item) => item.slug !== slug));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({ lines, count: ready ? lines.length : 0, ready, add, setQuantity, remove, clear }),
    [lines, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart doit être utilisé à l'intérieur de <CartProvider>.");
  }
  return context;
}
