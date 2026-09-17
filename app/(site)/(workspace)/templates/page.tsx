import { permanentRedirect } from "next/navigation";
// Templates now live under AI Books.
export default function Page() { permanentRedirect("/books/templates"); }
