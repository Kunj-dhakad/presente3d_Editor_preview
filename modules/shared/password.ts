// Password policy shared by the auth forms (live hints) and lib/auth.ts (enforcement).
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;

export const PASSWORD_RULES = [
  { id: "length", label: `At least ${PASSWORD_MIN} characters`, test: (p: string) => p.length >= PASSWORD_MIN },
  { id: "letter", label: "One letter", test: (p: string) => /[a-zA-Z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "One symbol (@#$!)", test: (p: string) => /[^a-zA-Z0-9\s]/.test(p) },
];

export const PASSWORD_HINT = `Use at least ${PASSWORD_MIN} characters with a letter, a number and a special character.`;

/** Returns an error message, or null when the password meets the policy. */
export function passwordError(password: unknown) {
  if (typeof password !== "string" || password.length > PASSWORD_MAX) return PASSWORD_HINT;
  return PASSWORD_RULES.every(rule => rule.test(password)) ? null : PASSWORD_HINT;
}
