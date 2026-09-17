import type { BlockBase, StrokeStyle, TextAlign } from "./blocks";

/**
 * Interactions are the only blocks a reader can *act* on, so they carry the
 * richest payload: quiz banks, form schemas, media URLs and navigation targets.
 */
export type InteractionKind =
  | "link-area"
  | "link-button"
  | "tag"
  | "caption"
  | "social"
  | "quiz"
  | "question"
  | "contact-form"
  | "embed-media"
  | "spotlight"
  | "video-button"
  | "audio-button"
  | "slideshow"
  | "popup-slideshow"
  | "nav-prev-page"
  | "nav-next-page"
  | "nav-goto-page"
  | "nav-first-page"
  | "nav-last-page"
  | "product-card"
  | "product-button"
  | "price-tag";

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  multiple: boolean;
  options: QuizOption[];
}

export type ContactFieldKind = "text" | "email" | "tel" | "textarea";

export interface ContactField {
  id: string;
  label: string;
  kind: ContactFieldKind;
  placeholder?: string;
  required: boolean;
}

export interface InteractionBlock extends BlockBase {
  kind: "interaction";
  interactionKind: InteractionKind;
  /** Inline SVG markup for the block's icon. */
  svg: string;
  text: string;
  tooltip?: string;
  link?: string;
  url?: string;
  target: "_self" | "_blank" | "popup";
  expandedText?: string;

  // Presentation
  fontFamily?: string;
  fontSize: number;
  fontWeight: number | string;
  textAlign: TextAlign;
  textColor: string;
  iconColor?: string;
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: "horizontal" | "vertical" | "diagonal";
  borderRadius: number;
  borderColor?: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;

  // Embedded media (already resolved by the authoring tool, so the viewer
  // never has to re-parse a provider URL for this kind).
  embedUrl?: string;
  provider?: string;
  renderMode?: "image" | "video" | "iframe" | "external";
  thumbnail?: string;
  autoplay: boolean;
  controls: boolean;
  allowFullscreen: boolean;

  // Engagement payloads
  quizTitle?: string;
  quizQuestions: QuizQuestion[];
  questionTitle?: string;
  questionText?: string;
  questionPlaceholder?: string;
  contactFormTitle?: string;
  contactFormDescription?: string;
  contactFields: ContactField[];
  privacyPolicyText?: string;
  privacyPolicyLink?: string;
  showMarketingOptIn: boolean;
  marketingOptInText?: string;
  spotlightTitle?: string;
  spotlightContent?: string;
  spotlightImageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  slideshowImages: string[];
  slideshowInterval: number;

  // Navigation
  navTargetPage: number;

  // Shop
  productName?: string;
  productPrice?: string;
  productImageUrl?: string;
}
