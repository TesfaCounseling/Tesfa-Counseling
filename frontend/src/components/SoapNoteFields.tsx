import type { ClinicalNote } from "@/lib/api";
import { SOAP_SECTIONS, type SoapFormValues } from "@/lib/soapNotes";

type SoapNoteFieldsProps = {
  form: SoapFormValues;
  onChange: (field: keyof SoapFormValues, value: string) => void;
  readOnly?: boolean;
};

export function SoapNoteFields({ form, onChange, readOnly = false }: SoapNoteFieldsProps) {
  return (
    <div className="space-y-4">
      {SOAP_SECTIONS.map((section) => (
        <section key={section.key} className="rounded-xl border border-ethio-border bg-white p-4">
          <div className="mb-3 flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ethio-green text-sm font-bold text-white">
              {section.letter}
            </span>
            <div>
              <h2 className="font-semibold text-ethio-ink">{section.label}</h2>
              <p className="text-xs text-ethio-ink-muted">{section.description}</p>
            </div>
          </div>
          <label className="block text-sm font-medium text-ethio-ink">
            <span className="sr-only">{section.label}</span>
            <textarea
              value={form[section.key]}
              onChange={(e) => onChange(section.key, e.target.value)}
              rows={4}
              readOnly={readOnly}
              required={!readOnly}
              className="input-field mt-1 resize-y"
              placeholder={section.placeholder}
            />
          </label>
        </section>
      ))}
    </div>
  );
}

type SoapNotePreviewProps = {
  note: Pick<ClinicalNote, "subjective" | "objective" | "assessment" | "plan">;
  compact?: boolean;
};

export function SoapNotePreview({ note, compact = false }: SoapNotePreviewProps) {
  const sections = SOAP_SECTIONS.map((section) => ({
    ...section,
    value: note[section.key]?.trim() || "",
  })).filter((section) => section.value || !compact);

  if (sections.length === 0) {
    return <p className="text-sm text-ethio-ink-muted">No SOAP content yet.</p>;
  }

  return (
    <div className="space-y-2 rounded-xl bg-ethio-surface p-4 text-sm">
      {sections.map((section) => (
        <div key={section.key}>
          <p className="font-semibold text-ethio-ink">
            {section.letter} — {section.label}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-ethio-ink-muted">{section.value}</p>
        </div>
      ))}
    </div>
  );
}
