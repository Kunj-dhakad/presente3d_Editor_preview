/** One entry on the Leads page: anything a reader sent from a published book. */
export type LeadKind = "lead" | "contact-form" | "quiz" | "question" | "review";
export type LeadReader = { name?: string; email?: string; phone?: string };
export type Lead = {
  id: string;
  kind: LeadKind;
  title: string;
  /** [label, value] in the order the form asked them. */
  answers: [string, string][];
  score?: { correct: number; total: number };
  stars?: number;
  reader: LeadReader;
  book: { id: string; title: string };
  created_at: string;
};

export const LEAD_KINDS: { id: LeadKind; label: string }[] = [
  { id: "lead", label: "Lead form" },
  { id: "contact-form", label: "Contact form" },
  { id: "quiz", label: "Quiz" },
  { id: "question", label: "Question" },
  { id: "review", label: "Rating" },
];
