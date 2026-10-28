import EditorWorkspace from "@editor/components/EditorWorkspace";

export const metadata = { title: "Presentation editor", robots: { index: false, follow: false } };

/** The editor, as the PHP app opens it in an iframe (edit-presentation/<id>). */
export default function Page() {
  return <EditorWorkspace />;
}
