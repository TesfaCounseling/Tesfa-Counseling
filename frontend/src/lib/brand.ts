export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Tesfa Counseling";

/** Geʽez script — “hope” */
export const TESFA_GEEZ = "ተስፋ";

export const TAGLINE = "Hope · Healing · Home";

export const MISSION =
  "Tesfa Counseling is a virtual counseling center dedicated to serving Ethiopians and Ethiopian families throughout the diaspora. Our culturally informed and compassionate team provides professional counseling for individuals, couples, families, and young adults.";

export const TESFA_MEANING =
  "“Tesfa” means hope in Amharic — from the ancient Ethiopian language of Geʽez (ተስፋ). It reflects our commitment to bringing hope and support to those we serve.";

export function appNameParts() {
  const parts = APP_NAME.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { first: APP_NAME, rest: "" };
  }
  return { first: parts[0], rest: parts.slice(1).join(" ") };
}
