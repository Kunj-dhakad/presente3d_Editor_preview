import { brandLogo } from "@shared/siteArt";

/** The AI Book Creator logo tile shown beside the name in the site and admin headers. */
export function BrandMark({ size = 35, src = brandLogo }: { size?: number; src?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- a small fixed-size logo served directly from its configured source
  return <img className="fs-brand-mark" src={src} width={size} height={size} style={{ width: size, height: size }} alt="" />;
}
