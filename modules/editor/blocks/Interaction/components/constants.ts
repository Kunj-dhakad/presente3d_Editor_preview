// import {
//   Link2,
//   Link,
//   CircleDot,
//   PlusCircle,
//   MonitorPlay,
//   GalleryHorizontal,
//   PictureInPicture2,
//   MessageSquareText,
//   Video,
//   // Clapperboard,
//   Volume2,
//   ShoppingCart,
//   ShoppingBag,
//   Tag,
//   ListX,
//   HelpCircle,
//   Mail,
//   ChevronLeft,
//   ChevronRight,
//   ArrowUpRight,
//   ChevronsLeft,
//   ChevronsRight,
//   CreditCard,
// } from "lucide-react";
// import {
//   FaTiktok,
//   FaPinterest,
//   FaRedditAlien,
//   FaSpotify,
//   FaYoutube,
//   FaInstagram,
//   FaFacebookMessenger,
//   FaFacebookF,
//   FaLinkedinIn,
//   FaXTwitter,
//   FaWhatsapp,
//   FaSnapchat,
// } from "react-icons/fa6";
// import { InteractionData, InteractionKind } from "@editor/store/editorStore";
// import { InteractionItem, SocialItem, WideInteractionItem } from "./types";

// export const genId = () =>
//   globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

// export const ENGAGEMENT_KIND_MAP: Record<string, InteractionKind> = {
//   Quiz: "quiz",
//   Question: "question",
//   "Contact form": "contact-form",
// };

// export const engagementDefaults: Record<
//   "quiz" | "question" | "contact-form" | "spotlight" | "video-button" | "audio-button" | "popup-slideshow",
//   Partial<InteractionData> & { width: number; height: number }
// > = {
//   quiz: {
//     width: 150,
//     height: 42,
//     text: "TAKE QUIZ",
//     quizTitle: "Quick quiz",
//     quizQuestions: [
//       {
//         id: genId(),
//         question: "What makes KPIs effective?",
//         multiple: false,
//         options: [
//           { id: genId(), text: "Aligning with goals", correct: false },
//           { id: genId(), text: "Being vague", correct: false },
//           { id: genId(), text: "Being measurable", correct: true },
//           { id: genId(), text: "Ignoring progress", correct: false },
//         ],
//       },
//     ],
//   },
//   question: {
//     width: 170,
//     height: 42,
//     text: "ANSWER QUESTION",
//     questionTitle: "Quick question",
//     questionText: "What's the overtime policy?",
//     questionPlaceholder: "Type your answer here…",
//   },
//   "contact-form": {
//     width: 140,
//     height: 42,
//     text: "Contact form",
//     contactFormTitle: "Tell us about this form",
//     contactFormDescription:
//       "This form intents to show you how a form will look like, so please fill free to complete every field, or not. No hard feelings.",
//     contactFields: [
//       {
//         id: genId(),
//         label: "Full company name",
//         type: "text",
//         placeholder: "Full company name",
//         required: true,
//       },
//       {
//         id: genId(),
//         label: "Email address",
//         type: "email",
//         placeholder: "Email address",
//         required: true,
//       },
//       {
//         id: genId(),
//         label: "Phone number",
//         type: "tel",
//         placeholder: "Phone number",
//         required: false,
//       },
//     ],
//     privacyPolicyText: "I agree to the following company's Privacy Policy:",
//     privacyPolicyLink: "https://demo.com",
//     showMarketingOptIn: true,
//     marketingOptInText: "I agree to receive marketing materials",
//   },
//   spotlight: {
//     width: 150,
//     height: 42,
//     text: "VIEW SPOTLIGHT",
//     spotlightTitle: "Featured spotlight",
//     spotlightContent:
//       "Share a featured story, announcement, or key piece of information with your readers.",
//     spotlightImageUrl: "",
//   },
//   "video-button": {
//     width: 145,
//     height: 42,
//     text: "WATCH VIDEO",
//     videoUrl: "",
//   },
//   "audio-button": {
//     width: 145,
//     height: 42,
//     text: "PLAY AUDIO",
//     audioUrl: "",
//   },
//   "popup-slideshow": {
//     width: 48,
//     height: 42,
//     text: "",
//     slideshowImages: [],
//     slideshowInterval: 3000,
//   },
// };


// export const DETAIL_ITEM_LABELS = new Set<string>([
//   "Embed Media",
//   "Video embed",
//   "Product card",
//   "Product button",
//   "Price tag",
//   "Slideshow",
//   "Pop-up slideshow",
// ]);

// export const linksAndTags: InteractionItem[] = [
//   { label: "Link area", icon: Link2, dashed: true },
//   { label: "Link button", icon: Link },
//   { label: "Tag", icon: CircleDot },
//   { label: "Caption", icon: PlusCircle },
//   // { label: "Embed Media", icon: Clapperboard },
// ];

// export const engagement: InteractionItem[] = [
//   { label: "Quiz", icon: ListX, dashed: true },
//   { label: "Question", icon: HelpCircle, dashed: true },
//   { label: "Contact form", icon: Mail },
// ];

// export const navigation: InteractionItem[] = [
//   { label: "Prev page", icon: ChevronLeft },
//   { label: "Next page", icon: ChevronRight },
//   { label: "Go to page", icon: ArrowUpRight },
//   { label: "First page", icon: ChevronsLeft },
//   { label: "Last page", icon: ChevronsRight },
// ];

// export const social: SocialItem[] = [
//   { label: "TikTok", icon: FaTiktok },
//   { label: "Pinterest", icon: FaPinterest },
//   { label: "Reddit", icon: FaRedditAlien },
//   { label: "Spotify", icon: FaSpotify },
//   { label: "YouTube", icon: FaYoutube },
//   { label: "Instagram", icon: FaInstagram },
//   { label: "Messenger", icon: FaFacebookMessenger },
//   { label: "Facebook", icon: FaFacebookF },
//   { label: "LinkedIn", icon: FaLinkedinIn },
//   { label: "X", icon: FaXTwitter },
//   { label: "Snapchat", icon: FaSnapchat },
//   { label: "WhatsApp", icon: FaWhatsapp },
// ];

// export const multimedia: InteractionItem[] = [
//   { label: "Spotlight", icon: MonitorPlay, pro: true },
//   { label: "Slideshow", icon: GalleryHorizontal, pro: true },
//   {
//     label: "Pop-up slideshow",
//     icon: PictureInPicture2,
//     pro: true,
//     dashed: true,
//   },
//   { label: "Embed Media", icon: MessageSquareText, pro: true },
//   { label: "Video button", icon: Video, pro: true },
//   { label: "Audio button", icon: Volume2, pro: true },
// ];

// export const shop: InteractionItem[] = [
//   { label: "Product card", icon: ShoppingCart, pro: true, dashed: true },
//   { label: "Product button", icon: ShoppingBag, pro: true },
//   { label: "Price tag", icon: Tag, pro: true },
// ];

// export const otherSquare: InteractionItem[] = [
//   { label: "Cart icon", icon: ShoppingCart },
//   { label: "Card icon", icon: CreditCard },
// ];

// export const otherWide: WideInteractionItem[] = [
//   { label: "Buy this item", icon: ShoppingCart },
//   { label: "Buy this item", icon: CreditCard },
// ];
import {
  Link2,
  Link,
  CircleDot,
  PlusCircle,
  MonitorPlay,
  GalleryHorizontal,
  PictureInPicture2,
  MessageSquareText,
  Video,
  // Clapperboard,
  Volume2,
  ShoppingCart,
  ShoppingBag,
  Tag,
  ListX,
  HelpCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  FaTiktok,
  FaPinterest,
  FaRedditAlien,
  FaSpotify,
  FaYoutube,
  FaInstagram,
  FaFacebookMessenger,
  FaFacebookF,
  FaLinkedinIn,
  FaXTwitter,
  FaWhatsapp,
  FaSnapchat,
} from "react-icons/fa6";
import { InteractionData, InteractionKind } from "@editor/store/editorStore";
import { InteractionItem, SocialItem, WideInteractionItem } from "./types";

export const genId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export const ENGAGEMENT_KIND_MAP: Record<string, InteractionKind> = {
  Quiz: "quiz",
  Question: "question",
  "Contact form": "contact-form",
};

export const engagementDefaults: Record<
  "quiz" | "question" | "contact-form" | "spotlight" | "video-button" | "audio-button" | "popup-slideshow",
  Partial<InteractionData> & { width: number; height: number }
> = {
  quiz: {
    width: 150,
    height: 42,
    text: "TAKE QUIZ",
    quizTitle: "Quick quiz",
    quizQuestions: [
      {
        id: genId(),
        question: "What makes KPIs effective?",
        multiple: false,
        options: [
          { id: genId(), text: "Aligning with goals", correct: false },
          { id: genId(), text: "Being vague", correct: false },
          { id: genId(), text: "Being measurable", correct: true },
          { id: genId(), text: "Ignoring progress", correct: false },
        ],
      },
    ],
  },
  question: {
    width: 170,
    height: 42,
    text: "ANSWER QUESTION",
    questionTitle: "Quick question",
    questionText: "What's the overtime policy?",
    questionPlaceholder: "Type your answer here…",
  },
  "contact-form": {
    width: 140,
    height: 42,
    text: "Contact form",
    contactFormTitle: "Tell us about this form",
    contactFormDescription:
      "This form intents to show you how a form will look like, so please fill free to complete every field, or not. No hard feelings.",
    contactFields: [
      {
        id: genId(),
        label: "Full company name",
        type: "text",
        placeholder: "Full company name",
        required: true,
      },
      {
        id: genId(),
        label: "Email address",
        type: "email",
        placeholder: "Email address",
        required: true,
      },
      {
        id: genId(),
        label: "Phone number",
        type: "tel",
        placeholder: "Phone number",
        required: false,
      },
    ],
    privacyPolicyText: "I agree to the following company's Privacy Policy:",
    privacyPolicyLink: "https://demo.com",
    showMarketingOptIn: true,
    marketingOptInText: "I agree to receive marketing materials",
  },
  spotlight: {
    width: 150,
    height: 42,
    text: "VIEW SPOTLIGHT",
    spotlightTitle: "Featured spotlight",
    spotlightContent:
      "Share a featured story, announcement, or key piece of information with your readers.",
    spotlightImageUrl: "",
  },
  "video-button": {
    width: 145,
    height: 42,
    text: "WATCH VIDEO",
    videoUrl: "",
  },
  "audio-button": {
    width: 145,
    height: 42,
    text: "PLAY AUDIO",
    audioUrl: "",
  },
  "popup-slideshow": {
    width: 48,
    height: 42,
    text: "",
    slideshowImages: [],
    slideshowInterval: 3000,
  },
};


export const NAV_KIND_MAP: Record<string, InteractionKind> = {
  "Prev page": "nav-prev-page",
  "Next page": "nav-next-page",
  "Go to page": "nav-goto-page",
  "First page": "nav-first-page",
  "Last page": "nav-last-page",
};

export const NAV_KINDS: InteractionKind[] = Object.values(NAV_KIND_MAP);

export const SHOP_KIND_MAP: Record<string, InteractionKind> = {
  "Product card": "product-card",
  "Product button": "product-button",
  "Price tag": "price-tag",
};

export const SHOP_KINDS: InteractionKind[] = Object.values(SHOP_KIND_MAP);

/**
 * Kinds drawn as a bare icon: they carry no words of their own, so the
 * settings panel must not offer a button label for them. Caption is here too —
 * its wording lives in `expandedText`, shown in the bubble it pops open.
 */
export const ICON_ONLY_KINDS: InteractionKind[] = [
  "link-area",
  "link-button",
  "tag",
  "caption",
  "social",
];

export const DETAIL_ITEM_LABELS = new Set<string>([
  "Embed Media",
  "Video embed",
  "Product card",
  "Product button",
  "Price tag",
  "Slideshow",
  "Pop-up slideshow",
]);

export const linksAndTags: InteractionItem[] = [
  { label: "Link area", icon: Link2, dashed: true },
  { label: "Link button", icon: Link },
  { label: "Tag", icon: CircleDot },
  { label: "Caption", icon: PlusCircle },
  // { label: "Embed Media", icon: Clapperboard },
];

export const engagement: InteractionItem[] = [
  { label: "Quiz", icon: ListX, dashed: true },
  { label: "Question", icon: HelpCircle, dashed: true },
  { label: "Contact form", icon: Mail },
];

export const navigation: InteractionItem[] = [
  { label: "Prev page", icon: ChevronLeft },
  { label: "Next page", icon: ChevronRight },
  { label: "Go to page", icon: ArrowUpRight },
  { label: "First page", icon: ChevronsLeft },
  { label: "Last page", icon: ChevronsRight },
];

export const social: SocialItem[] = [
  { label: "TikTok", icon: FaTiktok },
  { label: "Pinterest", icon: FaPinterest },
  { label: "Reddit", icon: FaRedditAlien },
  { label: "Spotify", icon: FaSpotify },
  { label: "YouTube", icon: FaYoutube },
  { label: "Instagram", icon: FaInstagram },
  { label: "Messenger", icon: FaFacebookMessenger },
  { label: "Facebook", icon: FaFacebookF },
  { label: "LinkedIn", icon: FaLinkedinIn },
  { label: "X", icon: FaXTwitter },
  { label: "Snapchat", icon: FaSnapchat },
  { label: "WhatsApp", icon: FaWhatsapp },
];

export const multimedia: InteractionItem[] = [
  { label: "Spotlight", icon: MonitorPlay, pro: true },
  { label: "Slideshow", icon: GalleryHorizontal, pro: true },
  {
    label: "Pop-up slideshow",
    icon: PictureInPicture2,
    pro: true,
    dashed: true,
  },
  { label: "Embed Media", icon: MessageSquareText, pro: true },
  { label: "Video button", icon: Video, pro: true },
  { label: "Audio button", icon: Volume2, pro: true },
];

export const shop: InteractionItem[] = [
  { label: "Product card", icon: ShoppingCart, pro: true, dashed: true },
  { label: "Product button", icon: ShoppingBag, pro: true },
  { label: "Price tag", icon: Tag, pro: true },
];

export const otherSquare: InteractionItem[] = [
  // { label: "Cart icon", icon: ShoppingCart },
  // { label: "Card icon", icon: CreditCard },
];

export const otherWide: WideInteractionItem[] = [
  // { label: "Buy this item", icon: ShoppingCart },
  // { label: "Buy this item", icon: CreditCard },
];
