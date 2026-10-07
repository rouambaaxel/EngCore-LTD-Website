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
  useMemo,
  useSyncExternalStore,
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

/*
  Le panier vit dans localStorage, que React lit par `useSyncExternalStore` :
  pendant le rendu serveur et l'hydratation, la version serveur (vide) est
  utilisée, puis React relit le navigateur — sans divergence d'hydratation, et
  sans l'effet de montage qui recopiait le stockage dans un état local. Les
  autres onglets sont suivis par l'événement « storage ».
*/

const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();

/** Navigation privée ou quota plein : le panier continue en mémoire. */
let storageBroken = false;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  if (storageBroken) return memoryRaw;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    storageBroken = true;
    return memoryRaw;
  }
}

// React exige le même objet tant que rien n'a changé : on ne relit le JSON
// que si la chaîne stockée diffère.
let cachedRaw: string | null | undefined;
let cachedLines: CartLine[] = EMPTY;

function getSnapshot(): CartLine[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parseStored(raw);
  }
  return cachedLines;
}

function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeLines(update: (current: CartLine[]) => CartLine[]) {
  const raw = JSON.stringify(update(getSnapshot()));
  memoryRaw = raw;
  if (!storageBroken) {
    try {
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      storageBroken = true;
    }
  }
  listeners.forEach((listener) => listener());
}

const noSubscription = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Vrai dès que le navigateur a été lu : faux au rendu serveur et à l'hydratation.
  const ready = useSyncExternalStore(noSubscription, () => true, () => false);
  const add = useCallback<CartContextValue["add"]>((line, quantity = 1) => {
    const wanted = Math.max(1, Math.floor(quantity));
    writeLines((current) => {
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
    writeLines((current) =>
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
    writeLines((current) => current.filter((item) => item.slug !== slug));
  }, []);

  const clear = useCallback(() => writeLines(() => []), []);

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
