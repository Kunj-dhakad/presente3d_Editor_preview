"use client";

import React from "react";
import { interactionIconSvg } from "../components/icons";
import {
    ENGAGEMENT_FALLBACK_LABEL,
    interactionLabel,
    type InteractionLabelSource,
} from "./interactionLabel";

export { ENGAGEMENT_FALLBACK_LABEL, interactionLabel };

/**
 * The visible contents of an interaction element: icon, label and — for shop
 * kinds — the product details.
 *
 * The editor canvas, the preview reader and the page thumbnails all render this
 * one component, so an interaction can never look different depending on where
 * it is drawn. Purely presentational: no store, no click handling.
 */

const SHOP_KINDS = new Set(["product-card", "product-button", "price-tag"]);

export type InteractionFaceData = InteractionLabelSource & {
    svg?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontFamily?: string;
    iconColor?: string;
    productName?: string;
    productPrice?: string;
    productImageUrl?: string;
};

const iconSizeFor = (kind: string) =>
    kind === "link-area" || kind === "product-card" ? 26 : 18;

export default function InteractionFace({
    data,
    audioPlaying = false,
}: {
    data: InteractionFaceData;
    /** Swaps the audio icon while a clip is playing. */
    audioPlaying?: boolean;
}) {
    const label = interactionLabel(data);
    const isShop = SHOP_KINDS.has(data.interactionKind);
    const isProductCard = data.interactionKind === "product-card";
    const textColor = data.textColor ?? "#ffffff";

    const labelStyle: React.CSSProperties = {
        color: textColor,
        fontSize: data.fontSize ?? 13,
        fontWeight: data.fontWeight ?? 700,
        fontFamily: data.fontFamily ?? "Inter",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        minWidth: 0,
    };

    const icon = data.svg ? (
        <span
            aria-hidden="true"
            style={{
                color: data.iconColor ?? textColor,
                width: iconSizeFor(data.interactionKind),
                height: iconSizeFor(data.interactionKind),
                flexShrink: 0,
                display: "inline-flex",
            }}
            dangerouslySetInnerHTML={{
                __html:
                    data.interactionKind === "audio-button" && audioPlaying
                        ? interactionIconSvg["audio-playing"]
                        : data.svg,
            }}
        />
    ) : null;

    /* ==================== SHOP ==================== */
    // Product name/price/image are collected in the Shop panel and settings;
    // without this they were stored but never drawn.
    if (isShop) {
        const price = (data.productPrice ?? "").trim();
        const name = (data.productName ?? "").trim();

        if (isProductCard) {
            return (
                <div
                    style={{
                        display: "flex",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    {data.productImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={data.productImageUrl}
                            alt=""
                            style={{
                                width: "42%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: 6,
                                flexShrink: 0,
                            }}
                        />
                    ) : (
                        icon
                    )}
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        {name && <span style={labelStyle}>{name}</span>}
                        {price && (
                            <span style={{ ...labelStyle, fontSize: (data.fontSize ?? 13) + 1 }}>
                                {price}
                            </span>
                        )}
                        {!name && !price && label && <span style={labelStyle}>{label}</span>}
                    </div>
                </div>
            );
        }

        // Product button / price tag: label first, price after it.
        const primary = data.interactionKind === "price-tag" ? price || label : label || name;
        const secondary = data.interactionKind === "price-tag" ? "" : price;
        return (
            <>
                {icon}
                {primary && <span style={labelStyle}>{primary}</span>}
                {secondary && (
                    <span style={{ ...labelStyle, opacity: 0.85 }}>{secondary}</span>
                )}
            </>
        );
    }

    /* ==================== EVERYTHING ELSE ==================== */
    return (
        <>
            {icon}
            {label && <span style={labelStyle}>{label}</span>}
        </>
    );
}
