import { Suspense } from "react";
import RegisterForm from "../RegisterForm";

export default function CounselorRegisterPage() {
  return (
    <Suspense fallback={<main className="page-shell flex items-center justify-center">Loading…</main>}>
      <RegisterForm defaultRole="therapist" lockRole />
    </Suspense>
  );
}
