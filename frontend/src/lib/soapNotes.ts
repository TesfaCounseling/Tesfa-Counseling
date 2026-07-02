import type { ClinicalNote } from "@/lib/api";

export const SOAP_SECTIONS = [
  {
    key: "subjective" as const,
    letter: "S",
    label: "Subjective",
    description: "What the client reported — concerns, mood, symptoms, context.",
    placeholder: "Client reported concerns, mood, relevant history, and session focus…",
  },
  {
    key: "objective" as const,
    letter: "O",
    label: "Objective",
    description: "What you observed — affect, behavior, engagement, mental status.",
    placeholder: "Observations, affect, engagement, appearance, and clinical observations…",
  },
  {
    key: "assessment" as const,
    letter: "A",
    label: "Assessment",
    description: "Your clinical impression — progress, diagnosis, risk, formulation.",
    placeholder: "Clinical impression, progress toward goals, risk factors, diagnosis…",
  },
  {
    key: "plan" as const,
    letter: "P",
    label: "Plan",
    description: "Next steps — interventions, homework, referrals, follow-up.",
    placeholder: "Interventions used, homework, referrals, and plan for next session…",
  },
];

export type SoapFormValues = Record<(typeof SOAP_SECTIONS)[number]["key"], string>;

export const EMPTY_SOAP_FORM: SoapFormValues = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

export function soapFormFromNote(note: ClinicalNote | null): SoapFormValues {
  if (!note) return { ...EMPTY_SOAP_FORM };
  return {
    subjective: note.subjective || "",
    objective: note.objective || "",
    assessment: note.assessment || "",
    plan: note.plan || "",
  };
}

export function missingSoapSections(form: SoapFormValues): string[] {
  return SOAP_SECTIONS.filter((section) => !form[section.key].trim()).map((section) => section.label);
}

export function soapSectionsComplete(form: SoapFormValues): boolean {
  return missingSoapSections(form).length === 0;
}
