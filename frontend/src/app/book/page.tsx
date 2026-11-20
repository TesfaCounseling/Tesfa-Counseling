import { permanentRedirect } from "next/navigation";

/** Short URL used in some CTAs; booking itself is `/counselors/[id]/book`. */
export default function BookPage() {
  permanentRedirect("/counselors");
}
