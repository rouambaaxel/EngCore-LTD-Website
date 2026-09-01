"use client";

import { useState } from "react";
import { useCart, type CartLine } from "@/lib/cart/context";

export default function AddToCartForm({
  line,
  labels,
}: {
  line: Omit<CartLine, "quantity">;
  labels: { addToCart: string; added: string; quantity: string };
}) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    add(line, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label
          htmlFor="cart-quantity"
          className="block text-xs font-medium text-slate-600"
        >
          {labels.quantity}
        </label>
        <input
          id="cart-quantity"
          type="number"
          min={1}
          max={9999}
          value={quantity}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            setQuantity(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
          }}
          className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="rounded-md bg-brand-orange px-5 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-yellow"
      >
        {justAdded ? `✓ ${labels.added}` : labels.addToCart}
      </button>
    </div>
  );
}
