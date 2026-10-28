import PresentationPreview from "@reader/components/PresentationPreview";

export const metadata = { title: "Presentation preview", robots: { index: false, follow: false } };

/** The full-page preview, as the PHP app opens it in an iframe; the slides arrive with LOAD_TEMPLATE. */
export default function Page() {
  return <PresentationPreview />;
}
