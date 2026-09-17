import type { SlideType } from "@editor/store/editorStore";


export interface TemplateListItem {
    id: number;
    thumbnail_url: string;
    title: string;
    template_category: string;
    json: string;
    json_url: string;
}

export type TemplateSlide = SlideType;
export type TemplatePreviewStatus = "loading" | "ready" | "error" | "empty";
 