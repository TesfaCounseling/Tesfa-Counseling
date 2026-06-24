"use client";

import { FormEvent, useState } from "react";
import type { Provider } from "@/lib/api";

export type IntakeFormData = {
  presenting_concerns: string;
  primary_goals: string;
  prior_therapy: string;
  current_medications: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  country: string;
  preferred_session_mode: "video" | "audio_only";
  supervised_care_consent: boolean;
  telehealth_consent: boolean;
  crisis_acknowledgment: boolean;
};

type TraineeIntakeFormProps = {
  provider: Provider;
  onSubmit: (data: IntakeFormData) => Promise<void>;
  initial?: Partial<IntakeFormData>;
  submitLabel?: string;
};

export default function TraineeIntakeForm({
  provider,
  onSubmit,
  initial,
  submitLabel = "Complete intake & continue to booking",
}: TraineeIntakeFormProps) {
  const [form, setForm] = useState<IntakeFormData>({
    presenting_concerns: initial?.presenting_concerns || "",
    primary_goals: initial?.primary_goals || "",
    prior_therapy: initial?.prior_therapy || "",
    current_medications: initial?.current_medications || "",
    emergency_contact_name: initial?.emergency_contact_name || "",
    emergency_contact_phone: initial?.emergency_contact_phone || "",
    country: initial?.country || "",
    preferred_session_mode: initial?.preferred_session_mode || "video",
    supervised_care_consent: false,
    telehealth_consent: false,
    crisis_acknowledgment: false,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.supervised_care_consent || !form.telehealth_consent || !form.crisis_acknowledgment) {
      setError("Please accept all required consents to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save intake");
    } finally {
      setSubmitting(false);
    }
  }

  function setField<K extends keyof IntakeFormData>(key: K, value: IntakeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="card-vibrant space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-ethio-ink">Intake for {provider.full_name}</h2>
        <p className="mt-2 text-sm text-ethio-ink-muted">
          {provider.full_name} is a <strong>supervised trainee</strong>, not an independently licensed counselor.
          A qualified supervisor reviews their work. This intake is required once before your first session.
        </p>
        {provider.program_name && (
          <p className="mt-1 text-sm text-ethio-ink-muted">Program: {provider.program_name}</p>
        )}
      </div>

      {error && <p className="alert-error">{error}</p>}

      <label className="block text-sm font-medium text-ethio-ink">
        What brings you to counseling? <span className="text-ethio-red">*</span>
        <textarea
          required
          rows={4}
          value={form.presenting_concerns}
          onChange={(e) => setField("presenting_concerns", e.target.value)}
          className="input-field mt-1 resize-y"
          placeholder="Current concerns, symptoms, or life stressors…"
        />
      </label>

      <label className="block text-sm font-medium text-ethio-ink">
        What do you hope to achieve? <span className="text-ethio-red">*</span>
        <textarea
          required
          rows={3}
          value={form.primary_goals}
          onChange={(e) => setField("primary_goals", e.target.value)}
          className="input-field mt-1 resize-y"
          placeholder="Goals for therapy…"
        />
      </label>

      <label className="block text-sm font-medium text-ethio-ink">
        Prior therapy or counseling (optional)
        <textarea
          rows={2}
          value={form.prior_therapy}
          onChange={(e) => setField("prior_therapy", e.target.value)}
          className="input-field mt-1 resize-y"
        />
      </label>

      <label className="block text-sm font-medium text-ethio-ink">
        Current medications (optional)
        <textarea
          rows={2}
          value={form.current_medications}
          onChange={(e) => setField("current_medications", e.target.value)}
          className="input-field mt-1 resize-y"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ethio-ink">
          Emergency contact name <span className="text-ethio-red">*</span>
          <input
            required
            value={form.emergency_contact_name}
            onChange={(e) => setField("emergency_contact_name", e.target.value)}
            className="input-field mt-1"
          />
        </label>
        <label className="block text-sm font-medium text-ethio-ink">
          Emergency contact phone <span className="text-ethio-red">*</span>
          <input
            required
            type="tel"
            value={form.emergency_contact_phone}
            onChange={(e) => setField("emergency_contact_phone", e.target.value)}
            className="input-field mt-1"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-ethio-ink">
        Country (optional)
        <input
          value={form.country}
          onChange={(e) => setField("country", e.target.value)}
          className="input-field mt-1"
        />
      </label>

      <div>
        <p className="text-sm font-medium text-ethio-ink">Preferred session format</p>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ethio-border p-3">
            <input
              type="radio"
              name="session_mode"
              checked={form.preferred_session_mode === "video"}
              onChange={() => setField("preferred_session_mode", "video")}
            />
            <span className="text-sm">Video session (camera on)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ethio-border p-3">
            <input
              type="radio"
              name="session_mode"
              checked={form.preferred_session_mode === "audio_only"}
              onChange={() => setField("preferred_session_mode", "audio_only")}
            />
            <span className="text-sm">Audio only (no camera — good for low bandwidth or privacy)</span>
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-ethio-surface-warm p-4 text-sm">
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={form.supervised_care_consent}
            onChange={(e) => setField("supervised_care_consent", e.target.checked)}
            className="mt-1"
          />
          <span>
            I understand I will receive services from a <strong>supervised trainee</strong>, not a fully licensed
            independent practitioner, and that a qualified supervisor oversees their clinical work.{" "}
            <span className="text-ethio-red">*</span>
          </span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={form.telehealth_consent}
            onChange={(e) => setField("telehealth_consent", e.target.checked)}
            className="mt-1"
          />
          <span>
            I consent to receive mental health services via secure telehealth (video or audio).{" "}
            <span className="text-ethio-red">*</span>
          </span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={form.crisis_acknowledgment}
            onChange={(e) => setField("crisis_acknowledgment", e.target.checked)}
            className="mt-1"
          />
          <span>
            I understand this service is <strong>not for emergencies</strong>. If I am in crisis I will call local
            emergency services (e.g. 911) or a crisis line (e.g. 988 in the US).{" "}
            <span className="text-ethio-red">*</span>
          </span>
        </label>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
