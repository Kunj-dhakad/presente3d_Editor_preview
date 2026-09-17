"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import { useAddInteraction } from "../../useAddInteraction";
import { SHOP_KIND_MAP } from "../../constants";

type ShopLabel = "Product card" | "Product button" | "Price tag";

export default function ShopDetail({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}) {
  const shopLabel = label as ShopLabel;
  const { addInteraction } = useAddInteraction();

  const [text, setText] = useState(
    shopLabel === "Product card"
      ? "Product name"
      : shopLabel === "Price tag"
        ? "$19.99"
        : "Shop now",
  );
  const [link, setLink] = useState("");
  const [price, setPrice] = useState(shopLabel === "Product card" ? "$19.99" : "");
  const [imageUrl, setImageUrl] = useState("");

  const canAdd = link.trim().length > 0;

  const create = () => {
    if (!canAdd) return;
    const kind = SHOP_KIND_MAP[shopLabel];
    addInteraction(kind);
    const store = useEditorStore.getState();
    const element = store.slides[store.activeSlide]?.elements.at(-1);
    if (element) {
      store.updateElement(
        element.id,
        {
          text,
          url: link.trim(),
          link: link.trim(),
          ...(shopLabel === "Product card"
            ? {
                productName: text,
                productPrice: price,
                productImageUrl: imageUrl,
              }
            : {}),
          ...(shopLabel === "Price tag" ? { productPrice: text } : {}),
        },
        { history: true },
      );
    }
    onBack();
  };

  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="kd-icon-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="kd-panel-header-title">{shopLabel}</span>
      </div>
      <div className="kd-panel-divider" />
      <p className="kd-panel-subtext" style={{ padding: "12px var(--kd-panel-pad) 0" }}>
        {shopLabel === "Product card"
          ? "Add a product card with an image, price, and a link to your product page."
          : shopLabel === "Product button"
            ? "Add a clickable button that links to your product page."
            : "Add a price tag that links to your product page."}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto space-y-3">
        <div>
          <label className="kd-btn-setting-label mb-1 block text-xs font-medium kd-fg">
            {shopLabel === "Product card"
              ? "Product name"
              : shopLabel === "Price tag"
                ? "Price"
                : "Button label"}
          </label>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              shopLabel === "Product card"
                ? "e.g. Wireless headphones"
                : shopLabel === "Price tag"
                  ? "e.g. $19.99"
                  : "e.g. Shop now"
            }
            className="w-full rounded-md border p-2 text-sm"
          />
        </div>

        {shopLabel === "Product card" && (
          <>
            <div>
              <label className="kd-btn-setting-label mb-1 block text-xs font-medium kd-fg">
                Price
              </label>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="e.g. $19.99"
                className="w-full rounded-md border p-2 text-sm"
              />
            </div>
            <div>
              <label className="kd-btn-setting-label mb-1 block text-xs font-medium kd-fg">
                Image URL <span className="kd-fg-subtle">(optional)</span>
              </label>
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://example.com/product.jpg"
                className="w-full rounded-md border p-2 text-sm"
              />
            </div>
          </>
        )}

        <div>
          <label className="kd-btn-setting-label mb-1 block text-xs font-medium kd-fg">
            Link URL
          </label>
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://example.com/product"
            className="w-full rounded-md border p-2 text-sm"
          />
          <p className="mt-1 text-[11px] kd-fg-muted">
            Opens when a reader clicks this {shopLabel.toLowerCase()} in preview.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={!canAdd}
        onClick={create}
        className="mt-3 w-full rounded-lg kd-bg-accent py-2.5 text-sm font-semibold kd-fg-on-accent disabled:opacity-50"
      >
        Add {shopLabel.toLowerCase()}
      </button>
    </div>
  );
}
