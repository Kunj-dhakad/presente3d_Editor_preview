import { brandLogo } from "@shared/siteArt";

/** The AI Book Creator logo tile shown beside the name in the site and admin headers. */
export function BrandMark({ size = 35 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- a small fixed-size logo from S3
  return <img className="fs-brand-mark" src={brandLogo} width={size} height={size} style={{ width: size, height: size }} alt="" />;
}
