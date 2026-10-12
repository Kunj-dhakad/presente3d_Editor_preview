import { BookOpen, Cpu, Images, LayoutTemplate } from "lucide-react";
import styles from "@site/styles/public-studio.module.css";

const types = [
  { icon: Cpu, name: "AI Books", description: "Start with an idea", tone: "violet" },
  { icon: BookOpen, name: "Flipbooks", description: "Bring pages to life", tone: "blue" },
  { icon: Images, name: "Visual stories", description: "Make every page shine", tone: "pink" },
  { icon: LayoutTemplate, name: "Templates", description: "Make it your own", tone: "teal" },
];

export default function CreationTypes({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.creationTypes} ${compact ? styles.creationCompact : ""}`}>
    {types.map(type => <div key={type.name} className={styles.creationType} data-tone={type.tone}>
      <span className={styles.dimensionalIcon}><type.icon strokeWidth={1.6} /></span>
      <strong>{type.name}</strong><small>{type.description}</small>
    </div>)}
  </div>;
}
