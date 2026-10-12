import Image from "next/image";
import { Check, Sparkles } from "lucide-react";
import styles from "@site/styles/public-studio.module.css";

export default function BookShowcase({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.showcase} ${compact ? styles.showcaseCompact : ""}`}>
    <Image src="/images/marketing/book-collection.webp" width={1536} height={1024}
      alt="A collection of illustrated books, travel guides, an open magazine and a digital book on a tablet"
      sizes={compact ? "(max-width: 780px) 1px, 45vw" : "(max-width: 780px) 95vw, 52vw"}
      loading="eager" fetchPriority={compact ? "auto" : "high"} />
    {!compact && <>
      <div className={styles.aiBadge}><span><Sparkles size={19} /></span><div><strong>Your imagination. Amplified.</strong><small>Meet your AI writing companion.</small></div></div>
      <div className={styles.readyBadge}><span><Check size={16} /></span><div><strong>Made by you.</strong><small>Ready for the world.</small></div></div>
    </>}
  </div>;
}
