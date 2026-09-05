const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const CODE_RE = /^[A-Z0-9]{8}$/;

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

const OK: ValidationResult = { ok: true };

export function validateName(value: string): ValidationResult {
  const name = value.trim();
  if (name.length < 2) return { ok: false, message: 'Please enter at least 2 characters.' };
  if (name.length > 40) return { ok: false, message: 'Name must be 40 characters or fewer.' };
  if (!/[a-zA-Z]/.test(name)) return { ok: false, message: 'Name must contain letters.' };
  return OK;
}

export function validateEmail(value: string): ValidationResult {
  const email = value.trim().toLowerCase();
  if (!email) return { ok: false, message: 'Email is required.' };
  if (!EMAIL_RE.test(email)) return { ok: false, message: 'Enter a valid email address.' };
  if (email.length > 120) return { ok: false, message: 'Email is too long.' };
  return OK;
}

export function validatePassword(value: string): ValidationResult {
  if (value.length < 8) return { ok: false, message: 'Use at least 8 characters.' };
  if (!/[a-zA-Z]/.test(value)) return { ok: false, message: 'Include at least one letter.' };
  if (!/[0-9]/.test(value)) return { ok: false, message: 'Include at least one number.' };
  return OK;
}

export function validateBio(value: string): ValidationResult {
  if (value.length > 140) return { ok: false, message: 'Bio must be 140 characters or fewer.' };
  return OK;
}

export function normalizeCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
}

export function validateCode(value: string): ValidationResult {
  const code = normalizeCode(value);
  if (code.length < 8) return { ok: false, message: 'Invitation codes are 8 characters long.' };
  if (!CODE_RE.test(code)) return { ok: false, message: 'Codes contain only letters and numbers.' };
  return OK;
}

/** Keeps user supplied text safe to render anywhere in the app. */
export function sanitizeText(value: string, max = 2000): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\r\n]{3,}/g, '\n\n')
    .slice(0, max);
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const head = user.slice(0, Math.min(2, user.length));
  return `${head}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}
