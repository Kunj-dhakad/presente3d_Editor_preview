import { createClient } from "@editor/lib/pexels-client";
import { apiFetch } from "@shared/apiFetch";


let pexels: ReturnType<typeof createClient> | null = null;
const pexelsClient = () => {
    if (!pexels) pexels = createClient();
    return pexels;
};

export type ImageRequest = {
    query: string;
    source?: "search" | "generate";
    aspectRatio?: number;
};

export type ImageResult = { url: string; source: "search" | "generate" };

const orientationFor = (aspectRatio?: number) => {
    if (!aspectRatio || !Number.isFinite(aspectRatio)) return "landscape" as const;
    if (aspectRatio > 1.15) return "landscape" as const;
    if (aspectRatio < 0.87) return "portrait" as const;
    return "square" as const;
};

const searchImage = async (request: ImageRequest): Promise<string | null> => {
    try {
        const response = await pexelsClient().photos.search({
            query: request.query,
            per_page: 10,
            orientation: orientationFor(request.aspectRatio),
        });
        if (!("photos" in response) || !response.photos.length) return null;
        // Slight variety so "replace the image" twice doesn't return the same photo.
        const photo = response.photos[Math.floor(Math.random() * Math.min(5, response.photos.length))];
        return photo.src.large || photo.src.original || null;
    } catch (error) {
        console.error("AI image search failed:", error);
        return null;
    }
};

const generateImage = async (prompt: string): Promise<string | null> => {
    try {
        const res = await apiFetch("/api/generate-openAiImage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!res.ok || typeof data?.url !== "string") return null;
        return data.url;
    } catch (error) {
        console.error("AI image generation failed:", error);
        return null;
    }
};

/**
 * Resolves a described image to a URL. Falls back from generation to search so a
 * missing/blocked image API never leaves an element blank.
 */
export const resolveImage = async (request: ImageRequest): Promise<ImageResult | null> => {
    if (!request.query.trim()) return null;

    if (request.source === "generate") {
        const generated = await generateImage(request.query);
        if (generated) return { url: generated, source: "generate" };
    }

    const found = await searchImage(request);
    if (found) return { url: found, source: "search" };

    if (request.source !== "generate") {
        const generated = await generateImage(request.query);
        if (generated) return { url: generated, source: "generate" };
    }
    return null;
};
