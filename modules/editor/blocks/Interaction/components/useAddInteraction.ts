import useEditorStore, {
  InteractionData,
  InteractionKind,
} from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { interactionIconSvg } from "./icons";
import { engagementDefaults, NAV_KINDS, SHOP_KINDS } from "./constants";

const NAV_DEFAULT_TEXT: Partial<Record<InteractionKind, string>> = {
  "nav-prev-page": "Prev",
  "nav-next-page": "Next",
  "nav-goto-page": "Go to page",
  "nav-first-page": "First",
  "nav-last-page": "Last",
};

export const useAddInteraction = () => {
  const addElement = useEditorStore((s) => s.addElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);

  const addInteraction = (kind: InteractionKind, platform?: string) => {
    const isEmbedMedia = kind === "embed-media";
    const isSlideshow = kind === "slideshow";
    const isNavigation = NAV_KINDS.includes(kind);
    const isShop = SHOP_KINDS.includes(kind);
    const isEngagement =
      kind === "quiz" || kind === "question" || kind === "contact-form" || kind === "spotlight" || kind === "video-button" || kind === "audio-button" || kind === "popup-slideshow";
    const engagementDefault = isEngagement
      ? engagementDefaults[kind as "quiz" | "question" | "contact-form" | "spotlight" | "video-button" | "audio-button" | "popup-slideshow"]
      : null;
    const [width, height] = engagementDefault
      ? [engagementDefault.width, engagementDefault.height]
      : isSlideshow
        ? [320, 220]
      : (
          {
            "link-area": [42, 42],
            "link-button": [42, 42],
            tag: [42, 42],
            caption: [42, 42],
            social: [42, 42],
            "embed-media": [400, 250],
            "nav-prev-page": [42, 42],
            "nav-next-page": [42, 42],
            "nav-goto-page": [140, 42],
            "nav-first-page": [42, 42],
            "nav-last-page": [42, 42],
            "product-card": [160, 160],
            "product-button": [150, 42],
            "price-tag": [90, 32],
          } as Record<
            Exclude<InteractionKind, "quiz" | "question" | "contact-form" | "spotlight" | "video-button" | "audio-button" | "slideshow">,
            [number, number]
          >
        )[
          kind as Exclude<InteractionKind, "quiz" | "question" | "contact-form" | "spotlight" | "video-button" | "audio-button" | "slideshow">
        ];
    const slide = slides[activeSlide];
    addElement({
      type: "interaction",
      interactionKind: kind,
      svg: isEmbedMedia
        ? ""
        : platform
        ? interactionIconSvg[platform as keyof typeof interactionIconSvg]
        : kind === "video-button" || kind === "audio-button" || kind === "popup-slideshow"
          ? interactionIconSvg[kind]
        : isEngagement
          ? ""
          : interactionIconSvg[
              kind as Exclude<
              InteractionKind,
                "social" | "quiz" | "question" | "contact-form" | "spotlight" | "video-button" | "audio-button" | "popup-slideshow" | "slideshow" | "embed-media"
              >
            ],
      platform,
      text: isEngagement ? "" : isNavigation ? (NAV_DEFAULT_TEXT[kind] ?? "") : "",
      x: (slide?.width ?? 350) / 2 - width / 2,
      y: (slide?.height ?? 490) / 2 - height / 2,
      width,
      height,
      rotation: 0,
      opacity: kind === "link-area" || kind === "product-card" ? 0.12 : 1,
      zIndex: 1,
      fontFamily: "Inter",
      fontSize: isEngagement ? 13 : 14,
      fontWeight: isEngagement ? 700 : 600,
      textColor: "#ffffff",
      backgroundColor: isEngagement
        ? "#18181b"
        : kind === "link-area"
          ? "#6366f1"
          : kind === "tag"
            ? "#7c3aed"
            : kind === "product-card"
              ? "#f97316"
              : kind === "product-button"
                ? "#4f46e5"
                : kind === "price-tag"
                  ? "#059669"
                  : isNavigation
                    ? "#334155"
                    : "#4f46e5",
      borderRadius: isEngagement
        ? 6
        : kind === "tag" || kind === "social" || kind === "price-tag" || isNavigation
          ? 999
          : 8,
      borderWidth: 0,
      iconPosition: "left",
      target: "_blank",
      tooltip:
        kind === "link-area"
          ? "Clickable area"
          : kind === "product-card"
            ? "Product details"
            : "",
      expandedText: "Add your caption text here.",
      ...(engagementDefault ?? {}),
      ...(isSlideshow ? { slideshowImages: [], slideshowInterval: 3000, backgroundColor: "#f8fafc", borderRadius: 8 } : {}),
      ...(kind === "nav-goto-page" ? { navTargetPage: 1 } : {}),
      ...(isShop ? { url: "", link: "" } : {}),
      ...(isEmbedMedia
        ? {
            url: "",
            embedUrl: "",
            provider: "Media",
            renderMode: "external" as const,
            thumbnail: "",
            padding: 0,
            borderRadius: 8,
            autoplay: false,
            controls: true,
            allowFullscreen: true,
            backgroundColor: "#f8fafc",
          }
        : {}),
    } as InteractionData);
    const inserted = useEditorStore
      .getState()
      .slides[activeSlide]?.elements.at(-1);
    if (inserted) useEditorStore.getState().setActiveElementId(inserted.id);
    const ui = useEditorUIStore.getState();
    ui.setActivePanelType("edit");
    ui.setSidebarWidth("edit");
    useEditorStore.getState().setActiveRightPanel("InteractionSettings");
  };

  return { addInteraction };
};
