/**
 * Formats a string as a US phone number: (000) 000-0000.
 * Strips all non-digit characters, then applies the mask progressively.
 * Safe to call on every keystroke — use the return value as the new field value.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
