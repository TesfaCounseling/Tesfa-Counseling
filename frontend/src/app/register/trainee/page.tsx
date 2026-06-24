import { Suspense } from "react";
import RegisterForm from "../RegisterForm";

export default function TraineeRegisterPage() {
  return (
    <Suspense fallback={<main className="page-shell flex items-center justify-center">Loading…</main>}>
      <RegisterForm defaultRole="trainee" lockRole />
    </Suspense>
  );
}
